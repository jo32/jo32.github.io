---
layout: post
title:  "像合成“雪碧图”一样合成“雪碧音”"
date:   2015-04-26 22:21:19
categories: javascript
---

# 为什么要合成“雪碧音”？

iOS, Windows Phone 和其他一些 Android 的手机对 HTML5 的声音支持非常有限，事实上最新的 Chrome for Android 41 才刚支持 Web Audio API，也就是说，所有的 Android 的基于 Webview 的网页展现形式都不支持 Web Audio API（在微信中就悲剧了），关于 Web Audio API 的支持情况[可以点这里](http://caniuse.com/#search=web%20audio%20api)。

很多手机平台只支持同时播放一个文件，加载更多的文件可能需要用户操作事件的支持（例如点击），同时加载多个文件需要发起多个请求，这会导致较长的加载时间。再者，多个 Audio 标签/对象可能会导致网页性能的降低。曾试过在同一页面中以创建 Audio 对象的形式加载多个生效文件，结果很卡。

一个缓解上述问题的问题，我们可以像合成“雪碧图”一样把声音文件合成一个“雪碧音”，然后采取有 fallback 的策略，在能支持 Web Audio API 的平台上用 Web Audio API 的形式播放声音，使得播放声音尽可能高效，在不支持的平台上降级为 Audio 的方式播放。

# 合成“雪碧音”

合成“雪碧音”的方法很简单，我们这里用 [audiosprite](https://github.com/tonistiigi/audiosprite) 这个工具来生成雪碧音。

## 安装 audiosprite

下面的安装过程以 OS X 平台为例，其他平台的安装方法可以到项目的 github 上面查看。

1. 运行 `sudo npm install -g audiosprite` 安装 audiosprite 命令行工具。
2. 运行 `brew install ffmpeg --with-theora --with-libogg --with-libvorbis` 用 brew 安装 ffmpeg 依赖。

## 使用 audiosprite 来合成“雪碧音”

假设你有如下声音文件：

    /PATH/TO/YOUR/PROJECT
    |____sound1.mp3
    |____sound2.mp3
    |____...

你可以运行 `sudo --format howler audiosprite --output audios *.mp3` 来生成“雪碧音”，得到的文件如下：

    /PATH/TO/YOUR/PROJECT
    |____.DS_Store
    |____audios.ac3
    |____audios.json
    |____audios.m4a
    |____audios.mp3
    |____audios.ogg
    |____sound1.mp3
    |____sound2.mp3
    |____test.html

可以看到，audiosprite 还会为你生成不同的格式的声音文件来提供声音播放的兼容性。接下来看看 audios.json 的内容：

    {
      "urls": [
        "audios.ogg",
        "audios.m4a",
        "audios.mp3",
        "audios.ac3"
      ],
      "sprite": {
        "audios": [
          0,
          8020.6575963718815
        ],
        "sound1": [
          10000,
          2299.84126984127
        ],
        "sound2": [
          14000,
          2299.84126984127
        ]
      }
    }

可以看到 sound2 的开始时间并不等于 sound1 的结束时间，这是因为 audiosprite 默认为“雪碧音”中的声音元素之间添加沉默间隔，这是一个很有用的功能，因为对声音进行跳转的时候会存在一定的不精确的情况，也就是说，如果不添加沉默间隔的话，用 JS 代码跳转到 sound2 的开始点的时候，可能会因为误差连带播放一点 sound1 的尾音。audiosprite 默认为我们添加沉默因，你可以通过 audiosprite 的选项取消这个功能，但是建议加上。

audiosprite 不仅提供命令行调用，本身也是一个 npm 模块，提供了相应的功能，需要自动化 build 的同学可以很方便地在此基础上造自己的 grunt 或者 gulp 插件。

# 播放雪碧音

有了 audios.json 这个文件，其实很容易可以实现自己“雪碧音”播放库。为了不重复造轮子，下面介绍一个提供 Web Audio API fallback 的库来播放兼容这个格式的库：[howler.js](https://github.com/goldfire/howler.js)。howler.js 是一个非常小但是稳定的库，gzip 之前的体积只有 12kb 左右。
。如果你在在用 CreateJS 的话，audiosprite 也可以生成 CreateJS 支持的 JSON 格式文件，本文不在此作更多介绍。

## 用 howler.js 播放“雪碧音”

用 howler.js 播放“雪碧音”的方法很简单，你只需要把 audiosprite 生成的 json 文件的内容作为 Howl 的实例化参数即可。

    <!DOCTYPE html>
    <html>
    <head>
        <title>Audio Sprite Test</title>
        <script type="text/javascript" src="./jquery-2.1.3.min.js"></script>
        <script type="text/javascript" src="./howler.min.js"></script>
        <script type="text/javascript"></script>
        <script type="text/javascript">
            var sound;
            $.getJSON('./audios.json', function(resp) {
                sound = new Howl(resp);
            });
            var play = function() {
                if (!sound) {
                    return;
                }
                sound.play('sound1').fade(1, 0, 1000);
                setTimeout(function() {
                    sound.play('sound2');
                }, 500);
            }
        </script>
    </head>
    <body>
    <input type="button" onclick="play()" value="play" />
    </body>
    </html>

# 播放声音需要注意的问题

1. 在不支持 Web Audio API 的平台上，有可能只能够同一时间播放一个元素（与平台限制有关）。

2. 在 iOS 设备上，只有用户事件（例如点击）才能播放声音。
