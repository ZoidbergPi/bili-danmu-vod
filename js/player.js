"use strict"
//player.js
//有关播放处理的类

var request = require('request');
var zlib = require('zlib');

class Song {
    constructor(songid, api, reqer) {
        this.songid = songid;
        this.api = api;
        this.reqer = reqer;
        this.info = this.getDetailInfo();
    }
    getDetailInfo() {
        var self = this;
        return Promise.all([this.api.songDetail(this.songid), this.api.songLyric(this.songid)]).then(function (data) {
            var detail = data[0];
            var lyric = data[1];
            
            /* 歌曲信息处理部分 */
            var songInfo = JSON.parse(detail).songs[0];
            self.title = songInfo.name;
            self.src = songInfo.mp3Url;
            self.duration = songInfo.duration;
            var artistArr = [];
            for (var artistIndex in songInfo.artists) {
                artistArr.push(songInfo.artists[artistIndex].name);
            }
            self.artists = artistArr.join("、");
            self.album = songInfo.album.name;
            self.cover = songInfo.album.picUrl;
            
            /* 歌词处理部分 */
            var lyricObj = JSON.parse(lyric);
            if (lyricObj.lrc == undefined) {
                self.lyric = null;
                self.tlyric = null;
            } else {
                //处理主要歌词
                if (lyricObj.lrc.lyric[0] != '[') {
                    //无可滚动歌词
                    self.lyric = null;
                } else {
                    self.lyric = lyricObj.lrc.lyric;
                }
                //处理翻译歌词
                if(lyricObj.tlyric == undefined){
                    self.tlyric = null;
                }else if (lyricObj.tlyric.lyric == null) {
                    self.tlyric = null;
                } else if (lyricObj.tlyric.lyric[0] != '[') {
                    //无可滚动歌词
                    self.tlyric = null;
                } else {
                    self.tlyric = lyricObj.tlyric.lyric;
                }
            }
            return self;
        });
    }
}

class Player {
    constructor(audioElement, api, infobox, nowinfo) {
        this.api = api;
        this.audioElement = audioElement;
        this.musicQueue = [];
        this.playing = null;
        this.infobox = infobox;
        nowinfo.status.status = "点歌方式：发送弹幕 点歌 歌曲名";
        this.nowinfo = nowinfo;
        this.voter = [];
        infobox.appendRed("初始化完成。");
        this.freePlaylist = [];
        this.freePlaylistIndex = 0;
        if (CONFIG.freePlay) {
            this.loadfreePlay();
        }
    }
    processRequest(skey, rname) {
        if (this.musicQueue.length >= 7) {
            this.infobox.appendRed(rname + " 点歌失败：播放列表已满。");
            this.nowinfo.status.status = "列表已满";
            return;
        }

        var self = this;
        this.api.search(skey).then(function (result) {
            var res = JSON.parse(result);
            if (res.result.songCount == 0) {
                self.infobox.appendRed(rname + " 点歌失败：未找到。");
            } else {
                var songId = res.result.songs[0].id;
                self.infobox.appendRed("找到歌曲ID: " + songId);
                self.addSong(songId, rname);
            }
        });
    }
    addSong(songId, rname) {
        var self = this;

        if (this.musicQueue.length >= 7) {
            this.infobox.appendRed(rname + " 点歌失败：播放列表已满。");
            this.nowinfo.status.status = "列表已满";
            return;
        }
        var rc = 0;
        if (this.playing != null && this.playing.reqer.indexOf(rname) != -1) {
            rc++;
        }
        for (var songIndex in this.musicQueue) {
            if (this.musicQueue[songIndex].reqer.indexOf(rname) != -1) {
                rc++;
            }
        }
        if (rc >= CONFIG.maxCountForone) {
            this.infobox.appendRed(rname + " 点歌失败：您已达点歌最大曲目上限。");
            return;
        }
        if (this.playing != null && this.playing.songid == songId) {
            this.infobox.appendRed(rname + " 点歌失败：您要点的歌当前正在播放。");
            return;
        }
        for (var songIndex in this.musicQueue) {
            if (this.musicQueue[songIndex].songid == songId) {
                this.infobox.appendRed(rname + " 点歌失败：列表中已有此歌曲。");
                return;
            }
        }

        var song = new Song(songId, this.api, "@" + rname + " 点播");
        if (this.playing == null) {
            this.playing = song;
            this.startPlay();
        } else {
            this.musicQueue.push(song);
            song.info = song.info.then(function () {
                self.nowinfo.list.push({
                    "title": song.title,
                    "artists": song.artists,
                    "duration": Player.formatTime(song.duration)
                });
                return song;
            });
            if (this.musicQueue.length >= 7) {
                this.nowinfo.status.status = "列表已满";
            }
        }
    }
    cancelRequest(rname) {
        var resIndex = -1;
        for (var songIndex in this.musicQueue) {
            if (this.musicQueue[songIndex].reqer.indexOf(rname) != -1) {
                resIndex = songIndex;
            }
        }
        if (resIndex == -1) {
            this.infobox.appendRed(rname + " 取消点歌失败：列表中没有您点的歌。");
        } else {
            this.deleteSong(resIndex);
            this.infobox.appendRed(rname + " 取消点歌成功。");
        }
    }
    deleteSong(index) {
        this.musicQueue.splice(index, 1);
        this.nowinfo.list.splice(index, 1);
    }
    voteForJump(rname) {
        if (this.voter.length == 0) {
            this.infobox.appendRed(rname + " 发起了投票跳过。");
            this.voter.push(rname);
            this.nowinfo.status.status = "发送弹幕 投票跳过 跳过此歌曲。已投票人数：" + this.voter.length;
        } else {
            if (this.voter.indexOf(rname) != -1) {
                this.infobox.appendRed(rname + " 投票失败：你已经投过票了。");
                return;
            } else {
                this.voter.push(rname);
                this.infobox.appendRed(rname + " 投票跳过当前歌曲。");
                this.nowinfo.status.status = "发送弹幕 投票跳过 跳过此歌曲。已投票人数：" + this.voter.length;
                if (this.voter.length >= CONFIG.nextNeedVote) {
                    this.checkNext();
                    this.infobox.appendRed("当前歌曲已被投票跳过。");
                    this.nowinfo.status.status = "点歌方式：发送弹幕 点歌 歌曲名";
                    this.voter = [];
                }
            }
        }
    }
    startPlay() {
        if (this.playing == null) {
            if (CONFIG.freePlay) {
                this.freePlay();
            } else {
                this.infobox.appendRed("错误：没有等待播放的歌曲。");
            }
            return;
        }

        var a = this.audioElement;
        var self = this;
        this.voter = [];
        this.nowinfo.status.status = "点歌方式：发送弹幕 点歌 歌曲名";
        //初始化
        a.currentTime = 0;
        $(a).unbind();
        //开始加载
        this.playing.info = this.playing.info.then(function () {
            a.src = self.playing.src;
            var lrcProvider = null;
            if (self.playing.lyric != null) {
                lrcProvider = new LrcProvider(self.playing, self.nowinfo);
            }
            $(a).on("ended", function (event) {
                self.nowinfo.info.lyric = "";
                self.nowinfo.info.tlyric = "";
                self.checkNext();
            });
            $(a).on("timeupdate", function (event) {
                var nowTime = a.currentTime * 1000;
                self.nowinfo.info.percent = (nowTime / self.playing.duration) * 100 + "%";
                self.nowinfo.info.nowtime = Player.formatTime(nowTime);
                if (lrcProvider != null) {
                    lrcProvider.syncLrc(nowTime);
                }
            });
            self.syncInfo();
            a.play();
        });
    }
    checkNext() {
        var a = this.audioElement;
        this.nowinfo.info.lyric = "";
        this.nowinfo.info.tlyric = "";
        a.pause();
        if (this.musicQueue.length <= 0) {
            this.playing = null;
            if (CONFIG.freePlay) {
                this.freePlay();
            } else {
                this.syncDefault();
            }
        } else {
            this.playing = this.musicQueue.shift();
            this.nowinfo.list.shift();
            if (this.musicQueue.length < 7) {
                this.nowinfo.status.status = "点歌方式：发送弹幕 点歌 歌曲名";
            }
            this.startPlay();
        }
    }
    freePlay() {
        if (this.freePlaylist.length <= 0) {
            this.infobox.appendRed("错误：空闲播放列表中没有歌曲。");
            return;
        }

        var nextSongId = this.freePlaylist[this.freePlaylistIndex % this.freePlaylist.length];
        this.freePlaylistIndex++;

        this.playing = new Song(nextSongId, this.api, "当前空闲，自动播放中");
        this.startPlay();
    }
    loadfreePlay() {
        var self = this;
        if (CONFIG.freePlay) {
            if (CONFIG.freelistId == undefined) {
                this.infobox.appendRed("错误：空闲时播放歌单未配置。");
                return;
            }
            this.api.playlistDetail(CONFIG.freelistId).then(function (data) {
                var res = JSON.parse(data);
                if (res.code != 200) {
                    self.infobox.appendRed("错误：歌单未找到。");
                } else {
                    var listarr = res.result.tracks;
                    for (var i in listarr) {
                        self.freePlaylist.push(listarr[i].id);
                    }
                }
            });
        }
    }
    pause() {
        var a = this.audioElement;
        if (a.paused) {
            a.play();
        } else {
            a.pause();
        }
    }
    get paused() {
        return this.audioElement.paused;
    }
    static formatTime(time) {
        var secondCount = Math.floor(time / 1000);
        var m = Math.floor(secondCount / 60);
        if (m >= 0 && m <= 9) m = "0" + m;
        var s = Math.floor(secondCount % 60);
        if (s >= 0 && s <= 9) s = "0" + s;
        return m + ":" + s;
    }
    syncInfo() {
        this.nowinfo.info.cover = this.playing.cover;
        this.nowinfo.info.title = this.playing.title;
        this.nowinfo.info.artists = this.playing.artists;
        this.nowinfo.info.album = this.playing.album;
        this.nowinfo.info.reqer = this.playing.reqer;
        this.nowinfo.info.duration = Player.formatTime(this.playing.duration);
    }
    syncDefault() {
        this.nowinfo.info.cover = "img/cover.jpg";
        this.nowinfo.info.title = "暂无音乐";
        this.nowinfo.info.artists = "";
        this.nowinfo.info.album = "";
        this.nowinfo.info.reqer = "";
        this.nowinfo.info.nowtime = "00:00";
        this.nowinfo.info.duration = "00:00";
        this.nowinfo.info.percent = "0%";
        this.nowinfo.info.lyric = "";
        this.nowinfo.info.tlyric = "";
    }
}
class LyricItem {
    constructor(text, start) {
        this.text = text;
        this.start = start;
        this.end = 0;
    }
}
class LrcProvider {
    constructor(song, nowinfo) {
        this.lyric = LrcProvider.convertLrc(song.lyric);
        if (song.tlyric != null) {
            this.tlyric = LrcProvider.convertLrc(song.tlyric);
        } else {
            this.tlyric = null;
        }
        this.nowinfo = nowinfo;
        this.lastTime = 0;
    }
    syncLrc(nowTime) {
        var i, ts;
        for (i = 0; i < this.lyric.length; i++) {
            ts = this.lyric[i]['start'];
            if (this.lastTime <= ts && nowTime >= ts) {
                this.nowinfo.info.lyric = this.lyric[i]['text'];
                break;
            }
        }
        if (this.tlyric != null) {
            for (i = 0; i < this.tlyric.length; i++) {
                ts = this.tlyric[i]['start'];
                if (this.lastTime <= ts && nowTime >= ts) {
                    this.nowinfo.info.tlyric = this.tlyric[i]['text'];
                    break;
                }
            }
        }
        this.lastTime = nowTime;
    }

    static convertLrc(lrctext) {
        var lrc = lrctext.split("\n"); //分行
        var len = lrc.length;
        var lyrics = new Array();
        var errorCount = 0;
        var offset = 0;
        for (var i = 0; i < len; i++) {
            var itemText = lrc[i];
            var timepos;
            if ((timepos = LrcProvider.taggedPos(itemText)) == -1) {
                errorCount++;
                continue;
            }
            var timeTagArray = new Array();
            var text = itemText;
            do {
                var timeTag = text.substr(1, timepos - 1);
                timeTagArray.push(timeTag);
                text = text.substr(timepos + 1);
            } while ((timepos = LrcProvider.taggedPos(text)) != -1);
            for (var j = 0; j < timeTagArray.length; j++) {
                var timeShiftArr = timeTagArray[j].split(":");
                if (timeShiftArr.length != 2) {
                    errorCount++;
                    continue;
                }
                if (timeShiftArr[0] == "offset") {
                    offset = Number(timeShiftArr[1]);
                    continue;
                }
                var min = Number(timeShiftArr[0]);
                if (isNaN(min)) {
                    continue;
                }
                var time = Number(timeShiftArr[1]);
                var startTime = 1000 * (min * 60 + time);
                var lycItem = new LyricItem(text, startTime);
                lyrics.push(lycItem);
            }
        }

        lyrics.sort(LrcProvider.sortedByStartTime);
        var lylen = lyrics.length;
        lyrics[0].start += offset;
        for (var i = 1; i < lylen; i++) {
            lyrics[i].start += offset;
            lyrics[i - 1].end = lyrics[i].start;
        }
        lyrics[lylen - 1].end = lyrics[lylen - 1].start + 10000;
        return lyrics;
    }
    static taggedPos(text) {
        if (text[0] != '[') {
            return -1;
        }
        return text.indexOf(']');
    }
    static sortedByStartTime(lyricItemA, lyricItemB) {
        return lyricItemA.start - lyricItemB.start;
    }
}




class CloudMusicApi {
    constructor() {
        this.j = request.jar();
        var cookie = request.cookie("appver=1.5.2");
        this.j.setCookie(cookie, "http://music.163.com/", function () { });
    }
    sendRequest(req) {
        return new Promise(function (resolve, rej) {
            var resStream = request(req);
            var resBuffer;
            resStream.on("data", function (chunk) {
                if (resBuffer == undefined) {
                    resBuffer = chunk;
                } else {
                    resBuffer = Buffer.concat([resBuffer, chunk]);
                }
            });
            resStream.on("end", function () {
                var headers = resStream.response.headers;
                if (headers['content-encoding'] != undefined && headers['content-encoding'].indexOf('gzip') != -1) {
                    //解压缩gzip
                    zlib.gunzip(resBuffer, function (err, plain) {
                        resolve(plain.toString());
                    });
                } else {
                    resolve(resBuffer.toString());
                }
            });
        });
    }
    //type: 1 - 单曲 10 - 专辑 100 - 歌手 1000 - 歌单 1002 - 用户
    search(keyword, type, offset, total, limit) {
        type = type || 1;
        offset = offset || 0;
        total = total || 'true';
        limit = limit || 60;

        var req = {
            method: "POST",
            url: "http://music.163.com/api/search/get/web",
            headers: CloudMusicApi.header,
            form: {
                "s": keyword,
                "type": type,
                "offset": offset,
                "total": total,
                "limit": limit
            },
            jar: this.j
        }

        return this.sendRequest(req);
    }
    //歌曲详情
    songDetail(songid) {
        var req = {
            method: "GET",
            url: "http://music.163.com/api/song/detail/?id=" + songid + "&ids=[" + songid + "]",
            headers: CloudMusicApi.header,
            jar: this.j
        }

        return this.sendRequest(req);
    }
    //歌词
    songLyric(songid) {
        var req = {
            method: "GET",
            url: "http://music.163.com/api/song/lyric?id=" + songid + "&lv=1&kv=1&tv=-1",
            headers: CloudMusicApi.header,
            jar: this.j
        }

        return this.sendRequest(req);
    }
    //歌单
    playlistDetail(playlistId) {
        var req = {
            method: "GET",
            url: "http://music.163.com/api/playlist/detail?id=" + playlistId + "&offset=0&total=true&limit=1001",
            headers: CloudMusicApi.header,
            jar: this.j
        }

        return this.sendRequest(req);
    }
}
CloudMusicApi.header = {
    "Accept": "*/*",
    "Referer": "http://music.163.com/search",
    "Accept-Encoding": "gzip, deflate, sdch",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36"
}