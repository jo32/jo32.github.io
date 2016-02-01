---
layout: post
title: 支持像 aa.bb.cc 这样的链式表达式的 React LinkedStateMixin
date: 2016-02-01T19:18:19.000Z
categories: javascript
---

React 原生的 LinkedStateMixin 并不支持像 `aa.bb.cc` 这样的链式表达式，下面提供一个比较简单的修改过后支持这用绑定的 Mixin，使用方法：

    <input type="text" className="form-control" id="rule-name" valueLink={this.linkState('rule.rule_name')} />

代码如下：

<script src="https://gist.github.com/jo32/977fa29012f2acd3d60a.js"></script>