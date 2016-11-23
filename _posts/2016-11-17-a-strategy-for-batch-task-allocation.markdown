---
layout: post
title:  "一个批量任务调度的策略"
date:   2016-11-17 22:21:19
categories: algorithm
---

# 面临的问题

## 一个比喻

设想有这么一个场景：

有一群乘客需要去往不同的地方，去往的地方不一定相同，每个乘客的重要程度不同（VIP 或者非 VIP），需要携带的货物数量也不同；有一辆大巴，一次可载若干个乘客和货物去往一个地方，跑一次任务至少需要一定的时间和代价（空跑和满载不是与乘客数等比，乘客越多，平均每个乘客代价越少）；每天这些乘客来的时间不同，会在某个地方按照到达顺序依次排队，司机有权利选择哪些乘客先上车和去往哪个地方。

按照这个场景的描述，我们当然是先来的更可能被处理，更重要的乘客优先被处理，汽车尽可能满载但又同时要保证每个乘客最终能够到达目的地。

## 具体例子

这个场景和我们最近遇到了一个问题比较类似：

我们的上游业务需要提交很多的离线的 HIVE SQL 查询任务，这些查询任务可能对应一张表（目的地相同）或者不同表（目的地不同），每个表有分区，每个 SQL 查询涉及的分区数不一样（需要携带的货物数量不同），查询任务按照提交时间提交到任务队列中（排队），我们提供的查询能力背后的逻辑是一次读整一个表的一个或者多个分区出来（像大巴一样的运作方式），然后再处理这些 SQL。我们当然是希望设计成同一表的 SQL 在同一个离线任务里面完成（这样就不用重复加载数据），先来的任务更可能被处理（公平性），重要的业务优先被处理，一次处理的任务数尽可能接近程序的运行能力（有效的资源利用，降低每个任务的平均消耗）。

举个例子，我有三个 SQL 等待执行:

1. ```SELECT * FROM db::tableA WHERE date >= '20161111' AND date < '20161113';```
2. ```SELECT a,b,c FROM db::tableA WHERE date >= '20161111' AND date < '20161112';```
3. ```SELECT d,e,f FROM db::tableB WHERE date date >= '20161113' AND date < ''20161114 ```

而我们的程序不是一个完整的 SQL 执行程序，至少在加载数据方面不是，它所使用的 API 是这样的：

```scala
// 初始化
val spark = SparkSession.builder().config(conf).getOrCreate()
val sqlContext = spark.sqlContext
val provider = new TDWSQLProvider(spark, "db")
// 读取数据
val dataframe = tdw.table("tableA", Seq("p_20161111", "p_20161112", "p_20161113", "p_s20161114"))
dataframe.createOrReplaceTempView("tableA")
// 保存数据
sqlContext.sql("SELECT * FROM tableA WHERE date >= '20161111' AND date < '20161113';").saveAsTextFile(...)
```

其中读取数据部分十分耗时，如果每次任务都起这个一个程序，显然不经济，如果我们可以改成：

```scala
// 读取数据
val dataframe = tdw.table("tableA", Seq("p_20161111", "20161112", "20161113", "20161114"))
dataframe.createOrReplaceTempView("tableA")
// 保存数据
tableASqlList.foreach((sql: String) => {
     sqlContext.sql(sql).saveAsTextFile(...)
})
```

这样显然会经济很多，因为可以复用加载的数据。

## 问题定义

剩下来的问题就是这个  `tableASqlList` 怎么选取了，按照上面讨论的，这个队列需要满足：

1. 队列内任务必须涉及同一个表
2. 队列长度不能超过系统承载能力
3. 先来的任务应当更可能被处理
4. 对于同一个表，数据重用度越高的用户应当更优先被处理；例如待处理的任务涉及表A的的分区有 12 个，其中任务1涉及 12 分区中 6 个，任务2设计 12 分去中的 4 个，那么任务1应该更可能被处理。
5. 所有任务在一直有新任务进来的情况下最终肯定会被处理

# 解决方法

假设我们已经通过词法分析和简单的语法分析拿到每条 SQL 的 db 名字和涉及的分区，每个任务可以简单地用 `(表名, 相关分区, 提交时间)` 表示，为了决定每个任务的优先级，我们决定采取对每个任务评分的策略，按照分数对任务先进行排序，然后按照分数从高到低选择任务，一旦有表对应的任务先达到任务数阀值，就选择该表的任务提交。我们采取的评价分数函数如下：

$$
(\frac{t_{当前}-t_{提交}}{t_{当前}-max(t_{提交})} + \frac{n_{表涉及分区数}}{max(n_{表涉及分区数})}) / (\frac{n_{表任务数}}{max(n_{表任务数量})})
$$

通过上面公式体现：

1.  时间提交越早，分数越高
2.  每个任务占表的涉及分区数越多，分数越高
3.  某个表任务数越多，分数越低

这样设计是因为可以保证：

1.  时间为维度，保证任务最终必须会被执行。
2.  数据重用度越高的任务越会被执行。
3.  表业务越繁重的业余降低执行权值，保证边缘业务不会被阻塞。

# 效果

原有的 TDW SQL 提交任务没有数据重用的考虑，导致每个任务需要 5min 左右的时间完成，我们以以下的 SQL 作为测试例子进行测试：

```sql
SELECT t1.famount,
       t1.fmerchant_trade_no,
       t1.fmch_name,
       t1.flast_update_time
FROM wxg_wechat_pay_app::t_inf_t_mkttaskdetail_day t1
  LEFT JOIN
    (SELECT max(flast_update_time) AS flast_update_time,
            fmerchant_trade_no
     FROM wxg_wechat_pay_app::t_inf_t_mkttaskdetail_day
     WHERE fcreate_time >= '${start_time}'
       AND fcreate_time < '${end_time}'
     GROUP BY fmerchant_trade_no) t2 ON t1.fmerchant_trade_no = t2.fmerchant_trade_no
  AND t1.flast_update_time = t2.flast_update_time WHERE t1.fcreate_time >= '${start_time}' AND t1.fcreate_time < '${end_time}'
```

在数据需要重用的情况下，第二个任务按照数据量可以缩短至 4s 至 1min，更多的数据后续补充。

# 不足

首先需要明确的是，上面的策略只是一种“启发式”的策略，并不能保证得到的调度序列是最优解；事实上即使得到当天队列状态调度的最优解，由于未来是不确定的，任何调度都可能致使后续调度恶化，所以我们这里不仅对任务的本身的属性进行调度，还根据公平性等考虑因素对资源进行调度。

<script async src='//cdn.bootcss.com/mathjax/2.6.1/MathJax.js?config=TeX-AMS-MML_HTMLorMML'></script>