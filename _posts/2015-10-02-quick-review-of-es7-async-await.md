---
layout: post
title:  "ES7 async/await saves the day"
date:   2015-10-02 18:53:00
categories: css
---

aysnc/await 语法其实是语法糖，背后的原理大概是：

1. generator
2. 返回 Thunk 的 generator
3. 返回 Thunk 的 generator 的执行器
4. async/await 翻译成带有自动执行执行器执行返回 Thunk 的 generator 的代码（写得有点绕 ...）

这样子的依赖路径，如果想知道 ES7 async/await 原理的话，可以看一下[阮一峰老师的系列文章](http://www.ruanyifeng.com/blog/2015/04/generator.html)，里面的讲解得非常好。这里想简单地说一下 ES7 的 async/await 是怎么用的来让大家感受一下它的魅力，和怎么用于 ES5 环境下。

## 用 async/await 写出与用 Promise 等价的代码。

### Promise 版本

    // Promise version
    function returnARandomValueAfter3s() {
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                // randomly fails it
                if (Date.now() % 1000 < 100) {
                    return reject(new Error('sorry, you are unlucky.'));
                }
                return resolve(Math.random());
            }, 3000);
        });
    }

    returnARandomValueAfter3s().then(function(value1) {
        console.log(value1);
        // do whatever you want with value1;
        return returnARandomValueAfter3s();
    }).then(function(value2) {
        console.log(value2);
        // do whatever you want with value2;
    }).catch(function(err) {
        console.log(err);
        // handle the error here
    });

### async/await 版本

    // Promise version
    function returnARandomValueAfter3s() {
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                // randomly fails it
                if (Date.now() % 1000 < 100) {
                    return reject(new Error('sorry, you are unlucky.'));
                }
                return resolve(Math.random());
            }, 3000);
        });
    }

    (async function() {
        try {
            var value1 = await returnARandomValueAfter3s();
            var value2 = await returnARandomValueAfter3s();
            console.log(value1);
            console.log(value2);
            // do whatever you want with value1 and value2;
        } catch(e) {
            console.log(err);
            // handle the error here
        }
    })();

## 需要注意的地方

以下说的不一定对，如果有说错的，请勘误。

1. await 后面必须接 Promise 对象。
2. Promise reject 的 error 可以用 try/catch 捕获到，如果不捕获，并不会中断进程的运行。
3. 不补抓的 error 可以在嵌套的 async 函数里向外冒泡。
4. async 函数应当被 async 函数用 awati 调用。

## 在实践中的代码是怎么样的

在实践中我们可以利用 [Q](https://github.com/kriskowal/q) 这个 package 来调用已有的 callback style 的代码（Promise 化），然后我们的异步代码，终于可以看起来很像同步的样子。

    // example
    var fs = require('fs');
    var Q = require('q');

    async function getFileContent() {
        return await Q.nfcall(fs.readFile, path.join(__dirname, '../resources/content.txt'), 'utf-8');
    }

    (async function() {
        try {
            var content = await getFileContent();
            console.log(content);
        } catch(e) {
            console.log(e);
        }
    })();

## ES5 环境中如何使用 async/await 语法

可以借助 [Babel](https://babeljs.io/) 来编译 async/await 语法，如果你在使用 gulp，可以如下编译：

    var gulp = require('gulp');
    var babel = require('gulp-babel');

    gulp.task('default', function() {
        gulp.src('./src/**/*.js')
            .pipe(babel({
                optional: ['runtime']
            }))
            .pipe(gulp.dest('./build'));
    });

需要注意的是，编译出来的需要 babel-runtime 这个包支持。

## 后语

async/await 的出现算是比较好地解决了 NodeJS callback hell 的问题，写出的代码比用 Promise 实现的还要优雅，Microsoft Edge 已经开始[原生支持 async/await 语法了](http://blogs.msdn.com/b/eternalcoding/archive/2015/09/30/javascript-goes-to-asynchronous-city.aspx)。总的来说，对于我这种脑子不大好使的人来说还是比较好使的 ...