"use strict"
//Classes.js
//各种实用类

var events = require('events');
var util = require('util');

//弹幕接收
class CommentProvider extends events.EventEmitter {
    constructor(roomid, infobox) {
        super();
        this.roomid = roomid;
        this.infobox = infobox;
        this.cmtServerPromise = this.getCmtServer();
        this.isConnect = false;
    }
    getCmtServer() {
        var self = this;
        return new Promise(function (res, rej) {
            self.infobox.append("[" + getTimeString() + "] 开始解析弹幕服务器地址。\n");
            $.get("http://live.bilibili.com/api/player?id=cid:" + self.roomid, function (data) {
                var xmlStr = "<root>" + data + "</root>";
                var xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
                var cmtServerUrl = $(xmlDoc).find("root>server").text();
                res(cmtServerUrl);
            });
        });
    }
    connect() {
        if (this.isConnect) {
            this.infobox.append("[" + getTimeString() + "] 已经连接了。\n");
            return;
        }
        var net = require("net");
        this.client = new net.Socket();
        var self = this;

        this.cmtServerPromise.then(function (cmtServer) {
            self.client.connect(88, cmtServer, function () {
                self.sendJoinMessage(); //发送加入频道信息
                self.isConnect = true;
                self.emit("connect");//连接event
                self.sendHeartBeat(); //开始循环发送心跳
            });
            //接收数据处理
            self.client.on("data", function (data) {
                self.processData(data);
            });
            //关闭连接处理（真·断开连接处理程序）
            self.client.on("close", function () {
                self.infobox.append("[" + getTimeString() + "] 连接中断。\n");
                self.isConnect = false;
                //结束发送心跳
                if (self.heartBeatLooper) {
                    clearInterval(self.heartBeatLooper);
                    self.infobox.append("[" + getTimeString() + "] 心跳数据包停止发送。\n");
                }
                self.emit("disconnect");//断开连接event
            })
        });
    }
    disconnect() {
        if (this.isConnect) {
            this.client.destroy();//distroy的过程中会触发socketclient的的close事件，从而运行真·断开连接处理程序。
            this.isConnect = false;
        } else {
            this.infobox.append("[" + getTimeString() + "] 未连接。\n");
        }
    }
    sendJoinMessage() {
        var buffer = new Buffer(12);

        buffer.writeUInt32BE(16842764, 0); //加入信息：0x01 0x01 0x00 0x0C
        buffer.writeUInt32BE(this.roomid, 4);
        buffer.writeUInt32BE(0, 8);

        this.client.write(buffer);
        this.infobox.append("[" + getTimeString() + "] 正在请求连接。\n")
    }
    sendHeartBeat() {
        var self = this;
        this.heartBeatLooper = setInterval(function () {
            if (self.isConnect) {
                var buffer = new Buffer(4);
                buffer.writeUInt32BE(16908292, 0); //房间人数查询：0x01 0x02 0x00 0x04（心跳包）
            
                self.client.write(buffer);
                console.log("[" + getTimeString() + "] 发送心跳数据包。\n");
            }
        }, 60000);
    }
    processData(data) {
        var typeId = data.readInt16BE(0);
        switch (typeId) {
            case 1: //观众人数
                var viewer = data.readInt32BE(2);
                console.log("观众人数：", viewer);
                break;
            case 2: //弹幕
                var length = data.readInt16BE(2);
                var json = data.toString('utf8', 4, length);
                //console.log("收到弹幕：", json);
                break;
            case 4: //用户命令
                var length2 = data.readInt16BE(2);
                var json2 = data.toString('utf8', 4, length2);
                //console.log("收到多条弹幕：", json2);
                var cmtArr = json2.split(String.fromCharCode(65533));
                for (var cmt in cmtArr) {
                    try {
                        var cmtJson = JSON.parse(cmtArr[cmt]);
                    } catch (e) {
                        console.log("无法解析的弹幕：", cmtArr[cmt]);
                    }
                    this.emit("comment", cmtJson);
                }
                break;
            case 8: // 新信息
                break;
            case 17: // debug
                break;
            case 5: //广播
            case 6: //滚屏
            default: //不知道收到啥了。
                var length3 = data.readInt16BE(2);
                var json3 = data.toString('utf8', 4, length3);
            //console.log("收到不重要的消息：", json3);
        }
    }
}
//解析真实房间号
class Room {
    constructor(roomid, infobox) {
        var self = this;
        this.infobox = infobox;
        this.infobox.append("[" + getTimeString() + "] 尝试连接 " + roomid + "\n");
        this.roomid = roomid;

        this.room = this.getTrueRoomId(roomid).then(function (tRoomId) {
            self.infobox.append("[" + getTimeString() + "] 真实房间号 " + tRoomId + "\n");
            return tRoomId;
        });
    }
    getTrueRoomId(roomid) {
        return new Promise(function (res, rej) {
            $.get("http://live.bilibili.com/" + roomid, function (data) {
                data.replace(/var ROOMID = (\d+);/, function ($0, $1) {
                    res($1);
                })
            });
        });
    }
}
class Infobox {
    constructor(element) {
        this.infoElement = element;
    }
    append(text) {
        this.infoElement.append(text);
        var top = this.infoElement.height();
        this.infoElement.parent().animate({ scrollTop: top });
    }
    appendRed(text) {
        text = "<span style=\"color: red\">" + text + "</span>\n";
        this.append(text);
    }
    clear() {
        this.infoElement.html("");
    }
}
function getTimeString() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    if (h >= 0 && h <= 9) {
        h = "0" + h;
    }
    if (m >= 0 && m <= 9) {
        m = "0" + m;
    }
    if (s >= 0 && s <= 9) {
        s = "0" + s;
    }
    return h + ":" + m + ":" + s;
}