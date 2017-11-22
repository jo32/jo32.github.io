---
layout: post
title:  "Preact对React有多兼容？"
date:   2017-11-21 12:53:31
categories: javascript
---

# Preact对React有多兼容？

## 背景

最近收到部门通知，需要求替换 Facebook 旗下所有开源项目。而作为 Facebook 最大的开源项目之一的 React 在微信支付一些内部项目有应用到，虽然 React 的开源协议已经替换为 MIT 协议了，但替换 React 还是被提到了日程。

鉴于在微信支付内部用到 React 的项目数量比较多，我们首选的并不是用 Vue 等框架来重构这些项目，而且选用 API 与 React 一样的无缝替代方案来替代 React。前期我们初步调研了 Github 上 Star 数比较多的两个方案 Preact 和 InfernoJS，在兼容至 IE8 的目标上，Preact 和 InfernoJS 两个方案都不能满足，具体如下：

|不兼容特性/兼容库|preact|infernojs|
|---|---|---|
|Getter/Setter|需改造|不需要|
|addEventListener|不需要|需改造|
|Dom 的 onload 事件|不需要|需改造|
|DOMNodeInserted|不需要|需改造|
|DOMNodeRemoved|不需要|需改造|
|DOMSubtreeModified|不需要|需改造|
|DOMCharacterDataModified|不需要|需改造|
|DOMAttributeNameChanged|不需要|需改造|
|DOMAttrModified|不需要|需改造|
|readystatechange|不需要|需改造|
|EventListener 原型绑定事件形式|不需要|需改造|

由于 Preact 源码相对简单且不兼容特性较少，改造初步估计较少，所以我们首先研究 Preact 对 React 的兼容性如何。

## 初步尝试

我们首先在尝试在我们 React+Redux+ReactRouter 技术栈（[请看这个 DEMO](http://xphp.oa.com/fe/crr-doc/todomvc/#/pages/index/index)）和两三个依赖较少的内部项目上尝试用 Preact 替代 React，发现没有问题。但是在有些用了 antd 的库的项目的某些组件的兼容上有问题，交互不能正常完成。为了全面采用 Preact， 我们需要对 Preact 对 React 的兼容性进行全面的了解，因为我们想到了**用 Preact 跑 React 15-stable 分支的 1347 个测试用例，看测试结果如何来判定 Preact 的兼容性**。

## Preact 跑 React 的测试用例

首先感谢 nelsonlu 使这个成为可能，我们首先对测试源码中的依赖进行替换，以下是我们的替换对应关系：

|源|目标|
|---|---|
|React|preact-compat|
|ReactDOM|preact-compat|
|ReactTestUtils|preact-test-utils|
|ReactDOMServer|preact-compat/server|
|ReactFragment|preact-compat/lib/ReactFragment|
|ReactMount|preact-compat/lib/ReactMount|
|ReactPerf|preact-compat/lib/ReactPerf|
|update|preact-compat/lib/update|
|create-react-class\*|preact-compat/lib/create-react-class\*|
|renderSubtreeIntoContainer|require('preact-compat').unstable_renderSubtreeIntoContainer|

经过替换之后，我们对 React 的测试进行运行，结果如下：

    Test Suites: 75 failed, 1 skipped, 30 passed, 105 of 106 total
    Tests:       769 failed, 6 skipped, 572 passed, 1347 total

还是结果发现有很多还是有很多测试用例运行失败的，我们尝试对失败的测试用例进行分类：

|理由|数量|
|---|---|
|没有按预期 warning 相关|152|
|缺乏 create-react-class/factory 依赖|26|
|在 dev 模式下，组件没有 _debugID|78|
|没有 _rootNodeID，组件内部实现相关|18|
|没有 _wrapperState，ReactDOMInput 的内部实现相关|11|
|没有 _currentElement, ReactCompositeComponent 的内部实现相关|39|
|没有 _renderedComponent, ReactCompositeComponent 的内部是想相关|27|
|ReactUpdate 内部依赖相关|19|
|内部事件实现相关|6|

以上这些可以说是内部实现相关的，对我们的兼容性分析无关，我们先忽略这部分测试用例，对剩下的 421 个测试用例进行分析，这些测试用例应该就反映了 Preact 的不兼容性。经过再一轮分析之后，我们发现了以下一些不通过的测试用例：

|理由|数量|
|---|---|
|边界情况未处理|60|
|Server Rendering 相关|17|
|preact-test-util 没有 findRenderedComponentWithType 方法|11|
|preact-test-util 没有 SimulateNative 对象|35|
|ART渲染相关|7|
|REACT NATIVE 相关|10|
|preact的ReactPerf是空实现|15|

以上情况应该不构成致命性的兼容性问题，同时我们发现包括但不仅限于以下一些严重程度比较高的问题：

1. [refs 对象在重渲染的时候没有更行](https://github.com/developit/preact-compat/issues/448)
2. [用 createFactory 创建元素时 ref 丢失](https://github.com/developit/preact-compat/issues/447)
3. [Element.getAttribute 返回 null](https://github.com/developit/preact-compat/issues/446)
4. [重渲染更改 defaultValue 时候不应该更改 input 的 value](https://github.com/developit/preact-compat/issues/445)
5. [当 container 重渲染的时候 textarea 的 value 为 null](https://jsfiddle.net/reactjs/69z2wepo/)
6. [textarea 的 defaultValue 没有设置](https://github.com/developit/preact-compat/issues/449)
7. 组件未加载的时候 findDOMNode 应该是 Null 但却返回对应对象
8. 返回的 element 不是 immutable 的
9. 绑定 input 的值为 0.0 时，input 不受控
10. preact 的 Element 在创建后 props 仍可写

发现包括但不仅限于以下未评估严重性的问题：

1. 元素的 key 不强制为 String
2. children 永远是数组
3. React 不允许从 props 中获取 key 和 ref，而 preact 可以
4. preact 的 ELement 的 prototype 为 VNode, React 的 ELement 的 prototype 为 Object
5. preact 的 isValidElement 不能识别 Element 经过 JSON.stringify 后再 parse 的对象，preact 的isValidElement 使用 prototype 来识别是否是 Element。

发现缺少的方法和属性：

1. 缺少 ReactDOM.unstable_batchUpdate 方法
2. 缺少 React.createMixin
3. 缺少 __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

由于分析用例的工作量巨大，截止发文章时刻，还未完成对所有用例的分析。

## 结论和建议

通过用例分析，发现还是有 Preact 对 React 还是有不少兼容性问题，初步估计大概 1/5 用例反映了 Preact 对 React 的兼容性问题。对于这个结果其实也在我们的预料之内，因为 Preact 的代码量，社区规模和应用范围和 React 都不在一个数量级上。尽管如此，用 Preact 替代 React 还是能够在我们大部分项目中成功替换，跑起来没有问题（替换成功可能得益于 1. 我们的项目依赖库比较少。 2. 我们项目推荐使用 PureComponent 实现视图层，用 Redux 管理数据并驱动视图层展现，所以涉及 React 的功能相对比较集中和统一）。

所以这些失败的用例不一定跟你们的项目代码相关，我们推荐还是使用 Preact 尝试替换你们的项目看看是否有问题。