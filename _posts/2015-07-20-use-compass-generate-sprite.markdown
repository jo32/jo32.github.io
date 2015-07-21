---
layout: post
title:  "用 compass 生成包含 retina 雪碧图的不完全指南"
date:   2015-7-20 19:05:19
categories: css
---

# <a name="details">细节</a>

如果对细节不感兴趣的同学可以直接跳到下面的[使用方法部分](#tutorial)。

使用 compass 生成 sprite 是一件很轻松的事情，但是 compass 本身并不支持自动生成支持 retina 设备 sprite。于是经过搜索，找到了一个解决方案：

https://github.com/AdamBrodzinski/Retina-Sprites-for-Compass

但是这个方案仅支持以下这种单一的调用方式：

    .classname {
        @include retina-sprite(icon-follow-button);
    }

具体产生的代码如下：

    .classname {
      height: 20px;
      width: 20px;
      background-image: url('../img/v4-sprites-sfc824c917d.png');
      background-position: -83px -5px;
      background-repeat: no-repeat;
      padding: 5;
    }
    @media (-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3 / 2), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
      .classname {
        background-image: url('../img/v4-sprites-2x-sbdb3d1e38f.png');
        background-position: -72.5px -5px;
        -moz-background-size: 1350px auto;
        -o-background-size: 1350px auto;
        -webkit-background-size: 1350px auto;
        background-size: 1350px auto;
      }
    }

其中 `icon-follow-button` 是 sprite 图片的名字，并不支持像 compass 自带的生成 sprite 图的方式，可以一次性生成各个 sprite 元素对应的 classname 的方式。于是我 fork 了一下，修改后了源码可以从这里查看：

https://github.com/jo32/Retina-Sprites-for-Compass

这个 fork 添加了一个 mixin，用以下这种调用方式：

    @include retina-classnames();

就可以生成各个 sprite 元素对应的 classname，一个生成后的 css 代码例子如下：

    .v4-sprites-icon-arrow-right-pure-white, .v4-sprites-icon-circle-dark-blue, ... {
      background-image: url('../img/v4-sprites-sfc824c917d.png');
    }
    @media (-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3 / 2), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
      .v4-sprites-icon-arrow-right-pure-white, .v4-sprites-icon-circle-dark-blue, ... {
        background-image: url('../img/v4-sprites-2x-sbdb3d1e38f.png');
        -moz-background-size: 1350px auto;
        -o-background-size: 1350px auto;
        -webkit-background-size: 1350px auto;
        background-size: 1350px auto;
      }
    }
    .v4-sprites-icon-arrow-right-pure-white {
      height: 13px;
      width: 13px;
      background-position: -5px -5px;
      background-repeat: no-repeat;
      padding: 5;
    }
    @media (-webkit-min-device-pixel-ratio: 1.5), (min--moz-device-pixel-ratio: 1.5), (-o-min-device-pixel-ratio: 3 / 2), (min-device-pixel-ratio: 1.5), (min-resolution: 144dpi) {
      .v4-sprites-icon-arrow-right-pure-white {
        background-position: -5px -5px;
      }
    }
    ...

# <a name="tutorial">具体使用方法</a>

## 添加依赖

将 `_retina-sprite.scss` 添加到你的项目中，然后以如下的方式引入：

    @import "relative/path/to/retina-sprites";

## 准备输入文件

首先你需要准备一倍图和两倍图两套，两套图内的同一 sprite 元素的名字需要相同。假设你的图片目录结构如下：

    .
    ├── v4-sprites
    │   ├── icon-arrow-right-pure-white.png
    │   ├── icon-circle-dark-blue.png
    │   └── ...
    │   └── searchbar-background.png
    ├── v4-sprites-2x
    │   ├── icon-arrow-right-pure-white.png
    │   ├── icon-circle-dark-blue.png
    │   ├── ...
    └── └── searchbar-background.png

## 引用 sprite 图

像如下一样引用这两套图，例子：

    $sprites: sprite-map("v4-sprites/*.png", $spacing: 5px, $layout: horizontal);
    $sprites2x: sprite-map("v4-sprites-2x/*.png", $spacing: 5px, $layout: horizontal);

其中 `$spacing` 是生成 sprite 图的各元素之间的间距，$layout 是生成 sprite 图的排布方式，这里选用的是横向排布。需要注意的是，[compass 智能排布方式（smart, 用的是一种解决 bin packing 的方法）并不支持间距功能](https://github.com/Compass/compass/issues/718)，2013 年已经有了这个 issue，但是至今没有加上这个功能，感觉有点坑。[通过修改 compass 源码的方式可以解决这个问题](http://stackoverflow.com/questions/16793278/generate-sprites-with-compass-with-smart-layout-and-spacing)，但是解决方式依然不够优雅。

## 调用 mixin

你可以以如下的方式调用 `_retina-sprites.scss` 带来的两个 mixin：

    .classname {
        @include retina-sprite(icon-follow-button-to-add);
    }

或者是

    @include retina-classnames();

## compile scss 文件

compile 你可以得到像如下的图片目录结构：

    .
    ├── v4-sprites
    │   ├── icon-arrow-right-pure-white.png
    │   ├── icon-circle-dark-blue.png
    │   └── ...
    │   └── searchbar-background.png
    ├── v4-sprites-2x
    │   ├── icon-arrow-right-pure-white.png
    │   ├── icon-circle-dark-blue.png
    │   ├── ...
    └── └── searchbar-background.png
    ├── v4-sprites-2x-sbdb3d1e38f.png
    └── v4-sprites-sfc824c917d.png

# 将 compass 与 gulp 结合在一起

在这里推荐 [gulp-compass](https://www.npmjs.com/package/gulp-compass) 这款插件，应该可以满足使用 compass 的一般需求。

适当添加 gulp 插件，还可以添加将二倍图转换成单倍图的流程，但是转换后的图片可能存在模糊的情况出现，个人选择自己准备单倍图和多倍图。

# 不足与感想

Compass 还是一个功能相对比较强大的框架，可以利用各种 mixin 来满足一些需求，同时通过研究这些 mixin，加上 Sass 本身带有的 Programmatic 的一些特性，可以实现其他更高层次的需求。

Compass 应该是为 sass 提供各种 helper 的较好的框架之一，但是似乎项目组迭代并不快，很多 feature，例如为 sprite 图的 smart 布局提供 padding 的功能至今还没有实现（尽管我感觉这是一个比较简单的需求）。尽管如此，貌似还没有其他框架能够替代 Compass。
