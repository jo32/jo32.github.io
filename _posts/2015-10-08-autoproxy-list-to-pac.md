---
layout: post
title:  "将 Autoproxy list 转换成 O(1) 查找复杂度的 PAC 文件"
date:   2015-10-08 22:21:19
categories: tool
---

## 命令行工具

由于众所周知的原因，[@clowwindy](https://github.com/clowwindy) 的一个将 Autoproxy list （默认是某list）转换成 PAC 的项目被移除，所以重复造了一个轮子，功能几乎是一样的，默认的输入也是某 list：

[https://github.com/jo32/autoproxy2pac](https://github.com/jo32/autoproxy2pac)

运行 `npm install -g autoproxy2pac` 就可以使用。

用法如下：

    Usage: autoproxy2pac [options]

    Options:

      -h, --help           output usage information
      -V, --version        output the version number
      -i, --input [path]   file path to the autoproxy file, an online download of g-f-w-list will happend if not given
      -o, --output [path]  file path to the generated pac, ./proxy.pac will be written is not given
      -p, --proxy <proxy>  proxy, required, for example: SOCKS 127.0.0.1:8080
      --precise            if generating a precise proxy pac according to Ad Block Plus implementation

其中不带 precise 模式，会采用 O(1) 查找复杂度的 fast 模式，根据域名匹配命中；带 precise 的是根据 Adblock Plus 的实现策略来匹配命中。

## HTTP 服务

### .pac 文件

我还部署了一个服务，每小时同步某 list，获取 PAC 文件用法如下：

http://aliyun.jiangdl.com:11082/proxy.pac?proxy=PROXY%20127.0.0.1:8080&precise=true

http://aliyun.jiangdl.com:11082/proxy.pac?proxy=PROXY%20127.0.0.1:8080&precise=false

### .mobileconfig 文件

为了方便，还添加了一个获取 .mobileconfig 文件的功能，.mobileconfig 文件对应是为 iOS 设置中国大陆运行商在数据网络下面的全局代理，用 Safari 打开像如下的网址，就可以设置代理：

http://aliyun.jiangdl.com:11082/apnp.mobileconfig?server=127.0.0.1&port=8080

项目地址：

[https://github.com/jo32/autoproxy-trans-service](https://github.com/jo32/autoproxy-trans-service)
