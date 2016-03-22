"use strict"
//Main.js
var Version = "0.1.1";

//初始化全局变量
var gui = require('nw.gui');
var win = gui.Window.get();
var room, cmtProvider;
var infobox = new Infobox($("#info"));
var api = new CloudMusicApi();

//初始化界面控制对象
var nowPlayingInfoDefault = '{"cover":"img/cover.jpg","title":"暂无音乐","artists":"",' +
    '"album":"","reqer":"","nowtime":"00:00","duration":"00:00","percent":"0%","lyric":"","tlyric":""}';
var nowPlaying = {};
nowPlaying.info = JSON.parse(nowPlayingInfoDefault);
nowPlaying.list = [];
nowPlaying.status = { status: "" };

//初始化播放器
var player = new Player($("#player")[0], api, infobox, nowPlaying);

//主函数
$(function () {
    //init
    $.material.init();
    $("title").html(CONFIG.name);
    $("#main-title").html(CONFIG.name);
    new Vue({
        el: "#nowplaying",
        data: nowPlaying.info
    });
    new Vue({
        el: "#playlist",
        data: {
            list: nowPlaying.list
        }
    });
    new Vue({
        el: "#player-status",
        data: nowPlaying.status
    });
    //actions bind
    $(document).on("click", "a[target=_blank]", function (event) {
        event.preventDefault();
        gui.Shell.openExternal(this.href);
        console.log("ddd");
        return false;
    });
    $(document).on("click", "#application-quit", function () {
        win.close();
    });
    $(document).on("submit", "#roomid-form", function (event) {
        event.preventDefault();
        startConnect();
        return false;
    });
    $(document).on("click", "#connect-button", function () {
        startConnect();
    });
    $(document).on("click", "#checkforupdate", function () {
        $("#updateinfo").html("检查中......");
        checkUpdate().then(function (data) {
            if (data.needupdate) {
                $("#updateinfo").html("发现新版本 " + data.latest + "。 请在<a href=\"" + data.url + "\" target=\"_blank\">" + data.url + "</a>处下载。");
            } else {
                $("#updateinfo").html("已经是最新版本");
            }
        });
    })
    //标题栏拖动
    $(document).on("mousedown", "#application-titlebar", function (event) {
        var oldX = event.clientX;
        var oldY = event.clientY;

        $(document).on("mousemove", function (event) {
            win.moveBy(event.clientX - oldX, event.clientY - oldY);
        });
        $(document).on("mouseup", function () {
            $(document).unbind("mousemove");
            $(document).unbind("mouseup");
        });
    });
    //快捷键绑定
    $(document).on("keydown", function (event) {
        var keyid = event.which;
        //F1 显示帮助信息
        if (keyid == 112) {
            $("#version").html(Version);
            $("#about").modal();
        }
        //debug用：F12打开调试工具。
        if (keyid == 123) {
            win.showDevTools();
        }
        //Ctrl+I 隐藏/显示关闭按钮
        if (keyid == 73 && event.ctrlKey) {
            $("#application-quit").fadeToggle();
        }
        //Ctrl+L 清空日志
        if (keyid == 76 && event.ctrlKey) {
            infobox.clear();
        }
        //Ctrl+0 恢复初始大小
        if (keyid == 48 && event.ctrlKey) {
            win.resizeTo(960, 540);
        }
        //播放器控制
        //Space 暂停/恢复播放
        if (keyid == 32) {
            if (player.paused) {
                infobox.appendRed("主播操作：恢复播放。");
            } else {
                infobox.appendRed("主播操作：暂停。");
            }
            player.pause();
        }
        //Ctrl+→ 下一曲
        if (keyid == 39 && event.ctrlKey) {
            infobox.appendRed("主播操作：下一曲。");
            player.checkNext();
        }
        //Ctrl + Shift + 1~7删除对应歌曲
        if (keyid >= 49 && keyid <= 55 && event.ctrlKey && event.shiftKey) {
            var key = keyid - 48;
            player.deleteSong(key - 1);
            infobox.appendRed("主播操作：删除播放列表第 " + key + " 首。");
        }
        //Ctrl+P 强制开始播放
        if (keyid == 80 && event.ctrlKey) {
            player.startPlay();
        }
    });
    //阻止文件拖进窗口
    $(window).on('dragover', function (event) {
        event.preventDefault();
        event.originalEvent.dataTransfer.dropEffect = 'none';
    });
    $(window).on('drop', function (event) {
        event.preventDefault();
    });
    //检查更新
    checkUpdate().then(function (data) {
        if (data.needupdate) {
            modal("检测到新版本 " + data.latest + "<br>请在<a href=\"" + data.url + "\" target=\"_blank\">" + data.url + "</a>处下载。", "发现新版本");
        }
    })
});

function startConnect() {
    if ($("#connect-button").data("status") == "connected") {
        //取消连接
        cmtProvider.disconnect();
        return;
    }

    if ($("#roomid").val() == "") {
        modal("房间号不能为空。", "错误");
        return;
    }
    if (isNaN(parseInt($("#roomid").val()))) {
        modal("房间号必须是一个整数。", "错误");
        return;
    }

    $("#connect-button").html("正在连接");
    $("#connect-button").data("status", "connected");
    $("#roomid").attr("disabled", "true");
    $("#application-quit").fadeOut();

    room = new Room($("#roomid").val(), infobox);
    cmtProvider = null;
    room.room.then(function (roomid) {
        cmtProvider = new CommentProvider(roomid, infobox);
        cmtProvider.connect();
        cmtProvider.on("connect", function () {
            $("#application-titlebar").removeClass("navbar-warning").addClass("navbar-inverse");
            $("#connect-button").html("已连接");
        });
        cmtProvider.on("disconnect", function () {
            $("#connect-button").data("status", "free");
            $("#application-titlebar").removeClass("navbar-inverse").addClass("navbar-warning");
            $("#roomid").removeAttr("disabled");
            $("#connect-button").html("未连接");
            $("#application-quit").fadeIn();
        })
        cmtProvider.on("comment", function (data) {
            try {
                var comment = data.info[1];
                var rname = data.info[2][1];

                if (data.cmd == "DANMU_MSG") {
                    infobox.append("[" + getTimeString() + "] " + rname + ": " + comment + "\n");
                }
                var res1 = comment.match(/^[点點]歌 (.+)$/)
                if (res1 != null) {
                    player.processRequest(res1[1], rname);
                }
                if (/^投票跳过$/.test(comment)) {
                    player.voteForJump(rname);
                }
                if (/^取消点歌$/.test(comment)) {
                    player.cancelRequest(rname);
                }
            } catch (e) {
                console.info("收到无法解析的弹幕：", data);
            }
        });
    })
}

function checkUpdate() {
    return new Promise(function (res, rej) {
        $.getJSON("https://zyzsdy.com/biliroku/vodupdate", {
            "version": Version
        }, function (data) {
            res(data);
        });
    });
}

function modal(content, title) {
    $("#modal-content").html(content);
    $("#modal-title").html(title);
    $("#modal").modal();
}