---
layout: post
title:  "在 Javascript 中用 base64 来序列化数组"
date:   2014-06-23 22:21:19
categories: stats
---

在工作中我们可能会经常遇到序列化一个对象成本文的情况，Javascript 提供的泛用方案是 JSON 对象，利用 `JSON.parse(...)` 和 和 `JSON.stringify(...)` 可以用来很轻易地序列化/反序列化那些本身和子属性可以用 `toString(...)` 方法表示的对象。

如果我们用 JSON.parse 来序列化包含 Number 的数组，固然是一个可行的方案，但是当数组的长度很长的时候，这种方案明显不高效。下面介绍一种利用 ArrayBuffer 和 Typed Array 的方法来较高效地序列化数组的方案。下述方法的 Runtime 为浏览器，在 NodeJS 下部分代码将有所不同。


## 将数组转化成 ArrayBuffer 对象

下面这段代码将普通数组转换成 ArrayBuffer 对象

    function normalArrayToArrayBuffer(array) {
        return new Float32Array(array).buffer;
    }

事实上，如果你的 Number 对象值的范围你有了解（例如 8 位 int 可以表示），你可以相应地用不同的 Typed Array 来生成 ArrayBuffer，使得 ArrayBuffer 占用的空间更小（例如可以用 Int8Array 来替代上述的 Float32Array）。


## 将 ArrayBuffer 对象转换成 base64

    function arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        // 在 NodeJS 下可用 new Buffer(binary).toString('base64') 来替代。
        return window.btoa(binary);
    }

上述代码的主要过程是将 ArrayBuffer 的每一个字节转换成字符串，再用 btoa 方法转换成 base64


## 将 base64 转换成 ArrayBuffer 对象

    function base64ToArrayBuffer(base64) {
        // 在 NodeJS 下可以用 new Buffer(base64, 'base64').toString() 来替代。
        var binaryString = window.atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

这个方法是上述方法的逆过程。获得 ArrayBuffer 之后，你就可以根据需求选择相应的 Typed Array 对象来解析 ArrayBuffer。


## 一个更优化的使用例子

我遇到了这么一个情况，我需要将集合 A 和集合 B 的无向对应情况用二位数组来表示，二位数组每一个元素的值只为 0 或 1，在这样的情况下，即使使用 Int8Array 来保存值是浪费的，因为每一个元素只需要用到 1 位来保存。

我采取的解决方案是将连续的 8 个元素用 1 个字节来保存，以下是我的事例代码：

    Frame.prototype.twoDArrayToArrayBuffer = function(twoDArray) {
        var BITS_PER_NUMBER = 8;
        var height = twoDArray.length;
        var width = twoDArray[0].length;
        var byteLength = Math.ceil((width * height) / BITS_PER_NUMBER);
        var arrayBuffer = new ArrayBuffer(byteLength);
        var view = new Uint8Array(arrayBuffer);
        var i = 0;
        var j = 0;
        var c = 0;
        var temp = 0;
        var viewIndex = 0;
        for (i = 0; i < height; i++) {
            for (j = 0; j < width; j++) {
                if (c == 0) {
                    temp = 0;
                }
                temp = temp | twoDArray[i][j] << c;
                c += 1;
                if (c == BITS_PER_NUMBER - 1) {
                    view[viewIndex] = temp;
                    viewIndex += 1;
                }
            }
        }
        if (c > 0) {
            view[viewIndex] = temp;
        }
        return arrayBuffer;
    }

查询某个元素是否为 1 的代码为：

    Frame.prototype.isBlackAt = function(x, y) {
        var BITS_PER_NUMBER = 8;
        var view = new Uint8Array(this.buffer);
        var index = Math.floor((y * this.height + x) / BITS_PER_NUMBER);
        var position = (y * this.height + x) % BITS_PER_NUMBER;
        var n = view[index];
        var isBlack = (n >> position) & 1;
        return isBlack == 1;
    }


## 使用例子：

    [
        [0, 1, 1],
        [1, 1, 1],
        [0, 1, 1]
    ]

这样的数组用 `JSON.string` 序列化得到的结果为：`[[0,1,1],[1,1,1],[0,1,1]`，而使用上述优化方法后得到的结果为：`Pr4=`。
