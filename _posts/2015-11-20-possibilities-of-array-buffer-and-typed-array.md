---
layout: post
title:  "动态雪碧图：ArrayBuffer/TypedArray 带来的可能性"
date:   2015-10-12 22:21:19
categories: javascript
---

[TOC]

## 前言

本文介绍 TypedArray, ArrayBuffer, Blob 以及他们的简单的使用方法，同时会举两个应用例子：

1. 在前端结算文件的 MD5 值。
2. 编辑 BMP 文件。
3. 后台合并任意的文件请求，前端解析该请求并按需读取。

## TypedArray, ArrayBuffer, Blob 的转化关系

首先可以简单地这么认为：Blob 代表的是一个文件，ArrayBuffer 代表的是文件的二进制内容，TypedArray 则是这些二进制内容用数表示的视图。

    +-----------------+ +-----------------+
    |File,String,Ajax | |Image,Audio,...  |
    +--+------+-------+ +---^-------------+
       *      |             |
       1 +-2--+-------------+
       | |    4
    +--v-+-+  |
    | Blob <------+---------------+
    +--+---+  |   |               |
       |      |   6               7
       3      |   |               |
       |     +v---+------+        |
       +----->ArrayBuffer|        |
             +----+------+        |
                  |               |
                  5          +----+-----+
                  +---------->TypedArray|
                             +----------+

由这三者的获取与转化一般分为上图中的几种途径：

1. 由 File, String, Ajax 请求获取 Blob
2. 由 Blob 充当 Image 等内容
3. 由 Blob 生成 ArrayBuffer
4. 由 File, String, Ajax 生成 ArrayBuffer
5. 由 ArrayBuffer 生成 TypedArray
6. 由 ArrayBuffer 生成 Blob
7. 由 TypedArray 生成 Blob

本文在下面的介绍过程当中会介绍到当中的几种情况。

## ArrayBuffer 简介

ArrayBuffer 用于表示通用的，定长的原始二进制数据 buffer。

> The ArrayBuffer object is used to represent a generic, fixed-length raw binary data buffer.

简而言之 ArrayBuffer 的一个实例就是可以理解为一个文件的二进制原始数据了。我们不能够直接操作 ArrayBuffer 对象，但是可以通过 TypedArray 来操作。

### 获取 ArrayBuffer 的途径

一下介绍主要对应浏览器环境，在 NodeJS 上面可能会有更多的快捷方法。

#### 从 Base64 String 获取

下面介绍一个方案，这个方案是的思路是先将 Base64 转换成普通的 String，将 String 转换成数据，再通过 Array.buffer 获取 ArrayBuffer

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

#### 从文件（Blob）获取 ArrayBuffer

假设你有一个 input：

    <input id="fs" type="file" />

那么你就可以通过以下代码来实现：

    function readAsArrayBuffer(file) {
        return new Promise(function(resolve, reject) {
            var fr = new FileReader();
            fr.onload = function(e) {
                return resolve(e.target.result);
            }

            fr.onerror = function(e) {
                return reject(e);
            }

            fr.readAsArrayBuffer(file)
        });
    }

    readAsArrayBuffer(document.getElementById('fs').files[0]).then(function(buffer) {
        console.log(buffer)
    });

#### 从 Ajax 获取 ArrayBuffer

    function ajaxAsArrayBuffer(url) {
        return new Promise(function(resolve, reject) {
            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";
            oReq.onload = function(oEvent) {
                return resolve(oReq.response);
            }
            oReq.send();
        });
    }

    ajaxAsArrayBuffer('/test.txt').then(function(buffer) {
        console.log(buffer);
    });

## TypedArray 简介

一个 TypedArray 对象描述了一个二进制数据 Buffer 的数据视图。

> A TypedArray object describes an array-like view of an underlying binary data buffer.

这里的二进制数据 Buffer 其实指的是就是一个 ArrayBuffer 对象，一个 TypedArray 可以通过 ArrayBuffer 对象产生，下文会提及到。TypedArray 指的是下面几个类的其中一种：

    Int8Array();
    Uint8Array();
    Uint8ClampedArray();
    Int16Array();
    Uint16Array();
    Int32Array();
    Uint32Array();
    Float32Array();
    Float64Array();

例如 Int8Array 的每一个元素是一个 8 位的有符号补码数，Uint8Array 对应的是 8 位无符号数。

### 通过 ArrayBuffer 声明 TypedArray

声明 TypedArray 的方式很简单，以 ArrayBuffer 为参数即可声明：

    var int32View = new Int32Array(buffer);

然后即可像普通的数组类型数组一样操作：

    int32View[0] >>>= 1;

## Blob 简介

Blob 对象用于描述一次类似于文件的，不可改变的原始数据。

> A Blob object represents a file-like object of immutable, raw data.

个人将 Blob 看作一个放置于内存的文件的对象。

### 由 ArrayBuffer 生成 Blob 对象，由 Blob 对象生成对应 DOM。

通过 ArrayBuffer, TypedArray, Blob 对象本身, DOMString 都可以新建一个 Blob 对象，例如：

    var oMyBlob = new Blob([int32View], {type : 'image/jpeg'});

获取 Blob 之后，就可以在资源的 src 里面引用这个 Blob：

    var img = new Image();
    // 缓存这个 url 会加速对 blob 的引用
    var url = (window.URL || window.webkitURL).createObjectURL(oMyBlob);
    img.src = url;

## 计算文件的 MD5 值

假设有这么一个 HTML 文件：

    <!DOCTYPE html>
    <html>
    <head>
        <title>Test File Api</title>
    </head>
    <body>
    file: <input id="fs" type="file"/> md5: <span id="md5">...</span>
    </body>
    <script type="text/javascript" src="bundle.js"></script>
    </html>

那么你可以用一下代码来在前端计算文件 MD5 值：

    var crypto = require('crypto');

    var fs = document.getElementById('fs');
    var md5Dom = document.getElementById('md5');

    function readAsArrayBuffer(file) {
        return new Promise(function(resolve, reject) {
            var fr = new FileReader();
            fr.onload = function(e) {
                return resolve(e.target.result);
            }

            fr.onerror = function(e) {
                return reject(e);
            }

            fr.readAsArrayBuffer(file);
        });
    }

    fs.addEventListener('change', function handleFileChange(e) {
        readAsArrayBuffer(e.target.files[0]).then(function(buffer) {
            var sum = crypto.createHash('md5');
            sum.update(buffer);
            md5Dom.innerText = sum.digest('hex');
        });
    });

我这里用到了 Webpack 来处理依赖，在命令行运行：

    webpack ./source.js bundle.js

可以得到 `bundle.js`

## 编辑 bmp 位图文件

假设有这么一个 HTML 文件：

    <!DOCTYPE html>
    <html>
    <head>
        <title>Test File Api</title>
    </head>
    <body>
    file: <input id="fs" type="file"/>
    </body>
    <script type="text/javascript" src="bundle.js"></script>
    </html>

假设选择的 BMP 文件是 10x10 大小的 24 位深 RGB 保存颜色的 BMP 文件，那么我们就可以像下面一样编写程序来改变 BMP 的第一行的像素的颜色。

为了方便阅读，需要补充说明的是[根据 BMP 的文件格式](https://en.wikipedia.org/wiki/BMP_file_format)，第 0x0A 位开始的 4 bytes 以小端格式保存 pixel array 的开始地址。每一个像素的颜色值以小端格式保存；逆序保存图片的每一行。

    var fs = document.getElementById('fs');

    function readAsArrayBuffer(file) {
        return new Promise(function(resolve, reject) {
            var fr = new FileReader();
            fr.onload = function(e) {
                return resolve(e.target.result);
            }

            fr.onerror = function(e) {
                return reject(e);
            }

            fr.readAsArrayBuffer(file);
        });
    }

    function editBmp(buffer) {
        var uint8View = new Uint8Array(buffer);
        // 获取 pixel array 的起始位置，小端转化为大端
        var pixelArrayOffset = 0;
        for (var i = 0x0D; i >= 0x0A; i--) {
            pixelArrayOffset <<= 8;
            pixelArrayOffset += uint8View[i];
        }
        // 将图片的最后一行弄成红色，颜色的存储也是按照小端存储
        var firstLineOffset = 9 * 32 + pixelArrayOffset;
        for (var i = firstLineOffset; i < firstLineOffset + 32; i++) {
            if ((i - firstLineOffset) % 3 == 2) {
                uint8View[i] = 0xFF;
            } else {
                uint8View[i] = 0x00;
            }
        }
        return buffer;
    }

    fs.addEventListener('change', function handleFileChange(e) {
        // 以 buffer 形式读取文件内容
        readAsArrayBuffer(e.target.files[0]).then(function(buffer) {
            // 展示未修改前的 BMP 文件内容
            var blob = new Blob([buffer], {
                type: 'image/bmp'
            });
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.src = url;
            document.body.appendChild(img);
            // 修改文件内容
            buffer = editBmp(buffer);
            // 展示未修改后的 BMP 文件内容
            var blob = new Blob([buffer], {
                type: 'image/bmp'
            });
            var url = URL.createObjectURL(blob);
            var img = new Image();
            img.src = url;
            document.body.appendChild(img);
        });
    });

我这里用到了 Webpack 来处理依赖，在命令行运行：

    webpack ./source.js bundle.js

可以得到 `bundle.js`

## 动态“雪碧图”解决方案

### 实现细节

这里所说的“雪碧图”并不是真的雪碧图，基本思路是这样的：

    +--------+               client side                +  server side      +--------+
    | File 1 <---+                                      |                +--> File 1 |
    +--------+   |                                      |                |  +--------+
                 |  +--------------+                    |     +--------+ |
    +--------+   +--+              +--------req-------------->+        +-+  +--------+
    | File 2 <------+ interpreter  |                    |     | concat +----> File 2 |
    +--------+      | middleware   +<-------------------------+ server |    +--------+
                 +--+              |    +-------------+ |     |        +-+
    +--------+   |  +--------------+    |concated resp| |     +--------+ |  +--------+
    |  ...   <---+  |                   +-------------+ |              | +-->  ...   |
    +--------+      |                                   |              |    +--------+
                    |                                   |              |
    +--------+      |                                   |              |    +--------+
    | File 2 <------+                                   |              +----> File 2 |
    +--------+                                          |                   +--------+
                                                        +

在服务器和客户端各加一个中间件，服务器端负责根据传过来的请求，将需要合并的文件合并成一个返回，然后客户端的中间件负责解析这样的请求，然后分拆成各个文件。

在实现之前，我们先定义一下返回的请求的格式，我们可以定义这么轻易返回：

    RESP:
        [NONSENSE]: 0x00, 8bytes; 无意义的文件开始字符，我这里用来对齐用。
        [FILE_DICT_TABLE_OFFSET]: 0x08, 4bytes, Uint32; File 映射表达的开始地址。
        [FILE_DICT_TABLE_LENGTH]: 0x0C, 4bytes, Uint32; 包含的 File 的个数。
        [FILE_DICT_TABLE]: 若干个文件映射表格。
        [FILE * n]: 若干个文件。

    FILE_DICT_TABLE:
        [FILE_DICT_TABLE_ITEM * n]: n 个文件映射。

    FILE_DICT_TABLE_ITEM:
        [FILE_OFFSET]: offset + 0x00, 4bytes, Uint32; 对应的 File 的开始地址。
        [FILE_BYTE_LEGNTH]: offset + 0x04, 4bytes, Uint32; 对应的是文件的字节数。
        [FILE_MIME_HASH]: offset + 0x08, 4bytes, Uint32; 对应的是文件的 MIME 的哈希值。
        [FILE_NAME_HASH]: offset + 0x0C, 4bytes, Uint32; 对应的是文件名的哈希值。

    FILE:
        [FILE_BINARTY_CONTENT]: 文件的二进制内容。

举个实际的返回例子，假设我们请求包含两个文件的请求（http://localhost:8081/sprite?file=img/a.png&file=img/b.png）：

    0000000: 4445 4d4f 4f4e 4c59 0000 0010 0000 0002  DEMOONLY........
                                           ---------> 有两个文件
    0000010: 0000 0030 0000 0ccc 352a 82c2 5df7 a87f  ...0....5*..]...
             ---------> 第一个文件在 0x030 开始
    0000020: 0000 0cfc 0000 0c73 352a 82c2 2d30 be7b  .......s5*..-0.{
             ---------> 第二个文件在 0xcfc 开始        
    0000030: 8950 4e47 0d0a 1a0a 0000 000d 4948 4452  .PNG........IHDR
             ----> 第一个文件的开始
    0000040: 0000 0032 0000 0032 0802 0000 0091 5d1f  ...2...2......].
    0000050: e600 0000 0970 4859 7300 000e c400 000e  .....pHYs.......
    0000060: c401 952b 0e1b 0000 0a4d 6943 4350 5068  ...+.....MiCCPPh
    0000070: 6f74 6f73 686f 7020 4943 4320 7072 6f66  otoshop ICC prof
    ...

下面先让我们看看服务端的实现代码：

    // server.js

    var fs = require('fs');
    var nch = require('non-crypto-hash');
    var murmurhash3 = nch.createHash('murmurhash3');
    var mime = require('mime');
    var express = require('express');
    var app = express();

    // 以下函数将任意字符串转化为 32bit 的哈希，以 Buffer 形式返回。
    function get32BitHexBuffer(inputString) {
        var hex = murmurhash3.x86Hash32(inputString);
        return new Buffer(hex, 'hex');
    }

    // 以 Buffer 的形式读取一个文件
    function readFilePromise(filePath) {
        return new Promise(function(resolve, reject) {
            fs.readFile(filePath, function(err, buffer) {
                if (err) {
                    return reject(err);
                }
                return resolve(buffer);
            });
        });
    }

    // 去读一个文件列表对应的 Buffer
    function getAllFilesBuffer(fileArray) {
        return Promise.all(fileArray.map(function(filePath) {
            return readFilePromise(filePath);
        }));
    }

    // 拼接 Buffer 成上述定义的格式
    function getConcatedBuffer(fileArray) {
        var offset = 0;
        var fileOffset = 0;
        var preConcatedBuffers = [];
        var tempBuffer = null;
        return getAllFilesBuffer(fileArray).then(function(buffers) {
            // 第一个文件开始的位置
            var fileOffset = 16 + 16 * fileArray.length;
            // 文件的总长度
            var totalByteLength = fileOffset + buffers.reduce(function(sum, val) {
                return sum + val.byteLength;
            }, 0);
            // 前 8 个字节存储成 'DEMOONLY' 的 ASCII 值
            preConcatedBuffers.push(new Buffer('DEMOONLY'))
            // 接下来 4 个字节存储成 0x10，表示索引表的开始
            tempBuffer = new Buffer(4);
            tempBuffer.writeInt32BE(0x0010, 0);
            preConcatedBuffers.push(tempBuffer);
            // 接下来 4 个字节存储成文件的个数
            tempBuffer = new Buffer(4);
            tempBuffer.writeInt32BE(fileArray.length, 0);
            preConcatedBuffers.push(tempBuffer);
            var tempFileOffset = fileOffset;
            // 对于每个文件生成索引
            fileArray.forEach(function(val, index) {
                // 每个索引的前 4 个字节存储为对应文件的开始地址
                tempBuffer = new Buffer(4);
                tempBuffer.writeInt32BE(tempFileOffset, 0);
                preConcatedBuffers.push(tempBuffer);
                // 接下来 4 个字节存储为对应文件的字节数
                var fileLength = buffers[index].byteLength;
                tempBuffer = new Buffer(4);
                tempBuffer.writeInt32BE(fileLength, 0);
                preConcatedBuffers.push(tempBuffer);
                // 接下来 4 个字节存储为 mime 字符串的 hash 值
                preConcatedBuffers.push(get32BitHexBuffer(mime.lookup(val)));
                // 接下来 4 个字节存储为文件名字符串的 hash 值
                preConcatedBuffers.push(get32BitHexBuffer(val));
                tempFileOffset += fileLength;
            });
            // 按顺序填充各个文件
            buffers.forEach(function(buffer, index) {
                preConcatedBuffers.push(buffer);
            });
            // 拼接 buffer
            return Buffer.concat(preConcatedBuffers);
        });
    }

    app.use(express.static('.'));

    app.get('/sprite', function(req, res, next) {

        var files = req.query.file;
        files = [].concat(files);
        if (!files.length) {
            return next(new Error('file parameter is empty'));
        }

        getConcatedBuffer(files).then(function(buffer) {
            res.type('application/octet-stream').send(buffer);
            return next();
        }).catch(function(err) {
            return next(err);
        });
    });

    app.use(function(err, req, res, next) {
        if (err) {
            res.status(err.status || 500).json({
                status: err.status || 500,
                msg: err.message
            });
        }
        return next(err);
    });

    var server = app.listen(8081, '0.0.0.0', function() {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Example app listening at http://%s:%s', host, port);
    });

然后看看前端是如何解析这个请求的：

    // 引入 murmurhash3
    var murmurhash3 = require('non-crypto-hash').createHash('murmurhash3');

    // 计算常用的 mime 字符串的 hash 值
    var mimeHashDict = ['image/png', 'text/plain', 'text/css', 'image/jpeg', 'application/javascript'].reduce(function(sum, val) {
        sum[murmurhash3.x86Hash32(val)] = val;
        return sum;
    }, {})


    var input = document.getElementById('files');
    var submitButton = document.getElementById('submit');

    // 以 buffer 请求获取
    function ajaxAsArrayBuffer(url) {
        return new Promise(function(resolve, reject) {
            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";
            oReq.onload = function(oEvent) {
                return resolve(oReq.response);
            }
            oReq.send();
        });
    }

    // 将文件解析成 Blob 对象，用 Hash 值索引
    function getBlobs(buffer) {
        var dataView = new DataView(buffer);
        // 获取文件的个数，读取 0x0C 开始的 4 字节。
        var listLength = dataView.getUint32(12);
        var blobs = {};
        for (var i = 0; i < listLength; i++) {
            var offset = 0x10 + 0x10 * i;
            // 获取每个文件的开始
            var fileOffset = dataView.getUint32(offset);
            // 获取每个文件的大小以及其他信息
            var fileSize = dataView.getUint32(offset + 4);
            var mimeHash = dataView.getUint32(offset + 8).toString(16);
            var filenameHash = dataView.getUint32(offset + 12).toString(16);
            // 转换成 blob
            var fileBuffer = buffer.slice(fileOffset, fileOffset + fileSize);
            var type = (mimeHashDict[mimeHash] != undefined) ? mimeHashDict[mimeHash] : 'application/octet-binary';
            blobs[filenameHash] = new Blob([fileBuffer], {
                type: type
            });
        }
        return blobs;
    }

    submitButton.addEventListener('click', function(e) {
        var files = input.value.split(',');
        var url = '/sprite?' + files.map(function(val) {
            return "file=" + val;
        }).join('&');
        ajaxAsArrayBuffer(url).then(function(buffer) {
            var blobs = getBlobs(buffer);
            files.forEach(function(val) {
                // DEMO 假设资源都是图片文件，以图片形式展示结构
                var wrapper= document.createElement('div');
                var hash = murmurhash3.x86Hash32(val);
                wrapper.innerHTML= val + ": <img src='" + URL.createObjectURL(blobs[hash]) + "' />";
                document.body.appendChild(wrapper);
            });
        }).catch(function(err) {
            return alert(err);
        })
    });

### 注意事项

1. 这种方案空间优势明显，通过传不同的参数还可以实现增量更新等。
2. 使用这种方案就等于完全抛弃了浏览器本身的请求/缓存策略，缓存等事情需要自己来解决，这是需要权衡的问题。
3. 虽然空间上没有那么高效（其实也不一定），SPDY/HTTP2 是本方案的替代方案，作为 SPDY/HTTP2 还没有普及的情况下，可以作为一种折衷成为合并请求的普遍解决方案。

## 例子地址

所有例子通过 Github 地址：

https://github.com/jo32/posibilities-of-arraybuffer-examples

访问到。
