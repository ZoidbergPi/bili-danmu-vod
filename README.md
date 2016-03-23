# 谜之弹幕点歌软件

如同它的名字那样。这个东西是个B站直播间使用的弹幕点歌软件。

使用nw.js编写。 

> 本点歌叽在空空视奸下开发

# Windows版

因为精力有限，我只能打包发布Windows版。

如果你想直接使用，请在下面地址下载我打包好的Windows版。

https://zyzsdy.com/bili-danmu-vod

其他操作系统用户请参考下面建立开发环境来使用。

**解压后可在`app`目录中的`config.js`文件内进行参数配置。**

**双击 启动谜之弹幕点歌软件.bat 来启动。**

**在主界面按下 `F1` 展开帮助说明。**

-------------

# 建立开发环境

## 准备环境

首先你需要有node.js环境。

然后安装 nw.js

    npm install -g nw
    
本项目依赖node.js组件“request”和“crypto”

    npm install request
    npm install crypto
    
由于授权协议原因，所以nw.js和本项目中都没有包含可用的MP3解码器。

请寻找一个带有mp3解码的ffmpegsumo.dll放置在nw.js的根目录下。

一般在：

    C:\Users\<Your username>\AppData\Roaming\npm\node_modules\nw\nwjs
    
目录。

> 如何寻找？一般是找一个和nw.js内核的Chromium版本相近的Chrome，从它的安装目录中提取。

> Mac用户或是Linux用户请寻找对应版本Chrome中的ffmpegsumo.so文件

> 你当然也可以自己编译一个，请参考nw.js文档中的[相关说明](https://github.com/nwjs/nw.js/wiki/Using-MP3-%26-MP4-%28H.264%29-using-the--video--%26--audio--tags.)。

## 调试运行

在项目目录下执行

    nw
    
主程序即可启动。

在主界面按下 `F12` 可以打开控制台面板。

# License

本项目在Apache License 2.0协议下开源。

# 使用的开源组件

[nw.js](https://github.com/nwjs/nw.js) v0.12.3 Licensed under MIT License

[jQuery](https://github.com/jquery/jquery) v2.2.0 Licensed under MIT License

[bootstrap](https://github.com/twbs/bootstrap) v3.3.6 Licensed under MIT License

[bootstrap-material-design](https://github.com/FezVrasta/bootstrap-material-design) v0.5.8 Licensed under MIT License

[vue.js](https://github.com/vuejs/vue) v1.0.16 Licensed under MIT License

[request](https://github.com/request/request) v2.69.0 Licensed under Apache License 2.0