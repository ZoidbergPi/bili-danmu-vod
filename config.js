/**
 * 本文件是bili-danmu-vod的配置文件和使用说明。请在文档指导下修改。
 * 
 * 基本操作：
 * 
 * 上方输入B站房间号，然后回车开始连接，标题栏从橙色变蓝即是连接成功，点歌软件随即开始工作。
 * 支持的弹幕：
 * 点歌 歌曲名
 * 点歌 网易云歌曲ID
 * 投票跳过
 * 取消点歌
 * 
 * 快捷键操作
 * 
 * F1 打开“帮助和关于”界面
 * F12 打开控制台（debug用）
 * Ctrl + 0 窗口恢复为默认大小
 * Ctrl + I 切换右上角关闭按钮的显示
 * Ctrl + L 清空日志输出
 * Ctrl + P 强制开始播放（用于在空闲但未播放随机歌曲时强制开始播放随机歌曲）
 * Space（空格） 暂停/恢复播放
 * Ctrl + → 下一曲
 * Ctrl + Shift + 1~7数字键 删除列表上1~7位置的歌曲
 */

//配置开始
var CONFIG = {
    //标题栏左上角出现的内容
    name: "谜之弹幕点歌姬",
    
    //高音质优先（网速条件不好建议不要开启，true -- 开启， false -- 关闭）
    highRate: true,
    
    //支持同一人最多同时点的歌曲数目
    maxCountForone: 3,
    
    //投票跳过所需的票数
    nextNeedVote: 3,
    
    //空闲时播放歌单(true -- 播放， false -- 不播放)
    freePlay: true,
    
    //空闲时播放的网易云歌单编号
    freelistId: 144580007,
    
    //输出歌词和标题信息到文件(true -- 打开， false -- 关闭)
    infoOutputFile: true,
    
    //当前歌词输出文件路径（请保证文件存在并可写，如果歌词不存在则全程为空）
    lyricFile: "lyric.txt",
    
    //翻译歌词输出文件路径（请保证文件存在并可写，如果翻译不存在则全程为空）
    tlyricFile: "lyric.tanslated.txt",
    
    //当前播放歌曲名称输出文件路径（请保证文件存在并可写）
    titleFile: "title.txt",
    
    //歌曲名称输出内容前缀
    titlePrefix: "Now playing: "
};