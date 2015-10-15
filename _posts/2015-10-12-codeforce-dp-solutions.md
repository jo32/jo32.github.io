---
layout: post
title:  "Codeforce DP 问题从易到难"
date:   2015-10-12 22:21:19
categories: algorithms
---

从大学以来算法就学得不好，是时候正视一下，以 Codeforce DP 问题上面的问题为入手点，从简单到难（很可能只解得出简单的 ...），一题一题解决，希望自己能够坚持下去。

<script type="text/javascript" src="//cdn.bootcss.com/zepto/1.1.6/zepto.min.js
" ></script>
<script type="text/javascript">
    (function() {
        document.write('<div class="gist-container"></div>');
        var $elem = $('.gist-container');
        $.getJSON('https://api.github.com/users/jo32/gists', function(resp) {
            var length = resp.length > 5 ? 5 : resp.length;
            var count = 0;
            for (var i in resp) {
                if (resp[i].description.indexOf('CODEFORCE') >= 0) {
                    $elem.append('<h2>' + resp[i].description + '</h2>');
                    $elem.append('<div class="gist-' + resp[i].id + '"></div>');
                    count += 1;
                    if (count <= length) {
                        (function(gist) {
                            for (var i in gist.files) {
                                var file = gist.files[i];
                                $('.gist-' + gist.id).append('<h3>' + file.filename + '</h3>');
                                $.get(file.raw_url, function(data) {
                                    $('.gist-' + gist.id).append('<pre><code>' + data + '</code></pre>');
                                });
                            }
                        })(resp[i]);
                    } else {
                        (function(gist) {
                            for (var i in gist.files) {
                                var file = gist.files[i];
                                $('.gist-' + gist.id).append('<h3>' + file.filename + '</h3>');
                                $('.gist-' + gist.id).append('<pre><code>' + file.raw_url + '</code></pre>');
                            }
                        })(resp[i]);
                    }
                }
            }
        });
    })();
</script>