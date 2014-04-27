/**
 * @file 异步上传组件
 * @author：张少龙（zhangshaolong@baidu.com）
 */
var Upload = (function(){
    var HIDDEN_REG = /^hidden/i;
    var INPUT_REG = /^input$/i;
    /**
     * 获取dom元素
     * @private param {string|dom|jquery} idOrNode 支持domId，dom元素和jquery包装的dom元素方式
     * @return {dom} 返回指定的dom元素
     */
    var  getNode = function(ele){
        return typeof ele == 'string' ? document.getElementById(ele) : ele.nodeName ? ele : ele[0];
    };
    /**
     * 获取元素相对body左上的位置
     * @private param {dom元素} ele
     * @return {object} 返回指定的dom元素相对body左上角的距离
     */
    var getPoint = function(ele){
        var t = ele.offsetTop;
        var l = ele.offsetLeft;
        while (ele = ele.offsetParent) {
            t += ele.offsetTop;
            l += ele.offsetLeft;
        }
        return {
            'top' : t,
            'left' : l
        };
    };
    /**
     * 为上传文件的同时提供传递其他参数
     * @private param {Upload对象} o
     */
    var setParams = function(o){
        var params = o.params,
            p, pNode, v;
        var form = o.uploadForm;
        for(p in params){
            pNode = form[p];
            if(INPUT_REG.test(pNode.nodeName) && HIDDEN_REG.test(pNode.type)){
                v = params[p];
                if(v.constructor === Function){
                    v = v();
                }
                pNode.value = v;
            }
        }
    };
    /**
     * 获取form提交到iframe之后，iframe收到的返回数据
     * @private param {iframe} ifm form提交到的iframe
     * @return {string} 返回响应数据
     */
    var getIframeContent = function (ifm) {
        var bd,
            doc = ifm.contentWindow ? ifm.contentWindow.document : ifm.contentDocument ? ifm.contentDocument : ifm.document;
        if(doc){
            bd = doc.body;
        }else{
            bd = (doc = ifm.documentElement).body;
        }
        return bd.textContent || bd.innerText;
    };
    /**
     * 提交上传的file
     * @private param {Upload对象} o
     */
    var submitFile = function (o) {
        if (o.status !== 'doing' && o.beforeUpload()) {
            o.status = 'doing';
            if(o.componentsMap['3']){
                resetProgress(o);
                clearTimeout(o.timer);
                o.timer = setTimeout(function(){getProgressRate.call(null, o);}, o.progressInterval);
            }
            setParams(o);
            o.uploadForm.submit();
        }
    };
    /**
     * 解析返回到iframe的数据
     * @private param {string} data 返回的数据
     * @private param {string} dataType f数据的解析方式
     * @return {*} 返回按照某种格式解析后的数据
     */
    var parseData = function(data, dataType){
        switch(dataType){
            case 'json' :
                return new Function('return ' + data)();
            case 'jsonp' :
                return eval('0, (' + data + ')');
            case 'xml' :
            case 'text' : 
            case 'html' :
            default :
                return data;
        }
    };
    /**
     * 动态创建iframe，用于模拟异步处理数据
     * @return {iframe} 返回指定id和名称的iframe
     */
    var createIframe = function (id) {
        var ifm;
        try {
            ifm = document.createElement('<iframe id="' + id + '" name="' + id + '" >');
        } catch (e) {
            ifm = document.createElement('iframe');
            ifm.name = ifm.id = id;
        }
        ifm.className = 'upload-iframe';
        return ifm;
    };
    /**
     * 绑定window的resize事件
     * @private param {dom元素} node 绑定事件元素
     * @private param {string} type 事件类型
     * @private param {function} fn 事件处理函数
     */
    var addEvent = function (node, type, fn) {
        if (node.attachEvent) node.attachEvent('on' + type, fn);
        else if (node.addEventListener) node.addEventListener(type, fn, !1);
        else node['on' + type] = fn;
    };
    /**
     * 重置进度条到初始化状态
     * @private param {Upload对象} o
     */
    var resetProgress = function (o) {
        o.finishedNode.style.width = '0%';
        o.progressNode.style.display = 'block';
        o.cancelNode.style.display = 'block';
        spaceHolder(o);
    };
    /**
     * 更新上传进度
     * @private param {Upload对象} o
     * @private param {string} v 当前进度（0~1）
     */
    var refreshProgress = function(o, v){
        clearTimeout(o.timer);
        var intv = parseInt(v);
        if(intv == 1){
            v = intv;
            o.cancelNode.style.display = 'none';
        }else {
            o.timer = setTimeout(function(){getProgressRate.call(null, o);}, o.progressInterval);
        }
        o.finishedNode.style.width = 100 * v + '%';
    };
    /**
     * 发送上传进度查询请求
     * @private param {Upload对象} o
     */
    var getProgressRate = function(o){
        o.progressForm.action = o.progressUrl + '?tmp=' + new Date().getTime();
        o.progressForm.submit();
    };
    /**
     * 生成上传文件的input对象
     * @private param {Upload对象} o
     */
    var initUploadText = function (o) {
        var uploadText = o.uploadText = document.createElement('div');
        uploadText.className = 'upload-input';
        uploadText.style.height = o.height + 'px';
        uploadText.style.lineHeight = o.height + 'px';
        uploadText.style.width = o.textWidth - 10 + 'px';
        o.uploadContainer.appendChild(uploadText);
    };
    /**
     * 生成上传浏览按钮
     * @private param {Upload对象} o
     */
    var initUploadBrowse = function (o) {
        o.fileUploadIframe = createIframe(o.uploadIframeId);
        var fileMask = document.createElement('div');
        fileMask.className = 'file-mask';
        fileMask.style.height = o.height + 'px';
        fileMask.style.width = o.browseWidth + 'px';

        var form = o.uploadForm = document.createElement('form');
        form.className = 'upload-form';
        form.style.height = o.height + 'px';
        form.style.width = o.browseWidth + 'px';
        form.method = 'POST';
        form.target = o.uploadIframeId;
        form.enctype = 'multipart/form-data';
        form.encoding = 'multipart/form-data';
        form.action = o.url;
        var browseText = document.createElement('div');
        browseText.className = 'browse-text';
        browseText.style.width = o.browseWidth + 'px';
        browseText.style.height = o.height + 'px';
        browseText.style.lineHeight = o.height + 'px';
        browseText.innerHTML = '浏览';
        
        var uploadFile = o.uploadFile = document.createElement('input');
        uploadFile.className = 'upload-file';
        uploadFile.style.width = o.browseWidth + 'px';
        uploadFile.style.height = o.height + 'px';
        uploadFile.type = 'file';
        if(o.mutiAble){
            uploadFile.multiple = 'multiple';
            uploadFile.setAttribute('multiple', 'multiple');
        }
        uploadFile.name = o.name;
        form.appendChild(browseText);
        form.appendChild(uploadFile);
        fileMask.appendChild(form);
        
        for(var p in o.params){
            var pNode = document.createElement('input');
            pNode.type = 'hidden';
            pNode.name = p;
            form.appendChild(pNode);
        }
        o.fileUploadIframe.onload = function () {
            var content = getIframeContent(o.fileUploadIframe);
            if (content) {
                o.status = 'idle';
                o.uploadHandler(parseData(content, o.dataType));
            }
        };
        uploadFile.onchange = function () {
            if (o.uploadText) {
                o.uploadText.innerHTML = o.uploadText.title = this.value;
            }
            if (!o.componentsMap['2']) {
                submitFile(o);
            }
        }
        o.uploadContainer.appendChild(fileMask);
        fileMask.appendChild(o.fileUploadIframe);
    };
    /**
     * 生成上传按钮
     * @private param {Upload对象} o
     */
    var initUploadButton = function (o) {
        var uploadButton = document.createElement('div');
        uploadButton.style.width = o.uploadWidth + 'px';
        uploadButton.style.height = o.height + 'px';
        uploadButton.style.lineHeight = o.height + 'px';
        uploadButton.className = 'upload-button';
        uploadButton.innerHTML = '上传';
        uploadButton.onclick = function () {
            if (o.uploadFile.value) {
                submitFile(o);
            }
        };
        o.uploadContainer.appendChild(uploadButton);
    };
    /**
     * 生成进度块
     * @private param {Upload对象} o
     */
    var initUploadProgress = function (o) {
        var progressNode = o.progressNode = document.createElement('div');
        var finishedNode = o.finishedNode = document.createElement('div');
        var cancelNode = o.cancelNode = document.createElement('div');
        progressNode.className = 'upload-progress';
        progressNode.style.height = o.height + 'px';
        progressNode.style.width = o.progressWidth + o.cancelWidth + 'px';
        finishedNode.style.width = '0px';
        finishedNode.style.height = o.height + 'px';
        finishedNode.className = 'upload-finished';
        cancelNode.className = 'upload-cancel';
        cancelNode.style.width = o.cancelWidth + 'px';
        cancelNode.style.height = o.height + 'px';
        cancelNode.style.lineHeight = o.height + 'px';
        cancelNode.title = '取消上传';
        cancelNode.innerHTML = '&times;';
        progressNode.appendChild(finishedNode);
        progressNode.appendChild(cancelNode);
        o.uploadContainer.appendChild(progressNode);
        o.progressIframe = createIframe(o.progressIframeId);
        
        var progressForm = o.progressForm = document.createElement('form');
        progressForm.className = 'progress-form';
        progressForm.method = 'GET';
        progressForm.target = o.progressIframeId;
        progressNode.appendChild(progressForm);
        progressNode.appendChild(o.progressIframe);
        
        o.progressIframe.onload = function () {
            var content = getIframeContent(o.progressIframe);
            if (content) {
                refreshProgress(o, parseData(content, 'text'));
            }
        };
        cancelNode.onclick = function () {
            var img = new Image();
            window.clearTimeout(o.timer);
            img.onload = img.onerror = function(){img = null;};
            img.src = o.cancelUrl;
            o.progressNode.style.display = 'none';
            spaceHolder(o);
            o.status = 'idle';
        };
    };
    /**
     * 组件全集
     */
    var initComponentsMap = {
        0: initUploadText,
        1: initUploadBrowse,
        2: initUploadButton,
        3: initUploadProgress
    };
    /**
     * 生成上传容器
     * @private param {Upload对象} o
     */
    var initContainer = function (o) {
        var resizeTimer;
        var uploadContainer = o.uploadContainer = document.createElement('div');
        uploadContainer.className = 'upload-container';
        uploadContainer.style.height = o.height + 'px';
        document.body.appendChild(uploadContainer);
        addEvent(window, 'resize', function(e){
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function(){
                o.reposition();
            }, 10);
        });
    };
    /**
     * 初始化参数
     * @private param {Upload对象} o
     * @private param {object} 各种配置参数
     */
    var initOptions = function (o, options) {
        o.baseNode = getNode(options.baseNode);
        o.progressUrl = options.progressUrl;
        o.cancelUrl = options.cancelUrl;
        o.cancelWidth = options.cancelWidth || 20;
        o.progressWidth = options.progressWidth || 100;
        o.mutiAble = options.mutiAble;
        o.dataType = options.dataType || 'json';
        o.url = options.url;
        o.name = options.name;
        o.height = options.height || 25;
        o.textWidth = options.textWidth || 200;
        o.browseWidth = options.browseWidth || 50;
        o.uploadWidth = options.uploadWidth || 50;
        o.uploadHandler = options.uploadHandler || function(data){};
        o.params = options.params || {};
        o.components = options.components || [0, 1, 2, 3];
        o.uploadIframeId = options.uploadIframeId || 'file-upload-iframe';
        o.progressIframeId = options.progressIframeId || 'upload-progress-iframe';
        o.progressInterval = options.progressInterval || 3000;
        o.status = 'idle'; // idle or doing
    };
    /**
     * 初始化组件，按照配置进行生成和布局
     * @private param {Upload对象} o
     */
    var initComponents = function (o) {
        var componentsMap = o.componentsMap = {};
        for (var i=0,len=o.components.length; i<len; i++) {
            componentsMap[o.components[i]] = 1;
        }
        for (var i=0,len=o.components.length; i<len; i++) {
            initComponentsMap[o.components[i]](o);
        }
    };
    /**
     * 根据实际生成的上传组件计算是否需要设置参考元素的宽高
     * @private param {Upload对象} o
     */
    var spaceHolder = function (o) {
        var space = o.space;
        if (!space) {
            var space = o.space = document.createElement('div');
            space.className = 'space-base';
            o.baseNode.appendChild(space);
        }
        space.style.height = space.style.lineHeight = o.height + 'px ';
        space.style.width = o.uploadContainer.offsetWidth + 'px';
        o.baseNode.style.height = o.height + 'px';
        o.baseNode.style.width = o.uploadContainer.offsetWidth + 'px';
    };
    /**
     * 生成上传组件
     * @private param {Upload对象} o
     */
    var initUpload = function (o) {
        initContainer(o);
        initComponents(o);
        spaceHolder(o);
        o.reposition();
    };
    /**
     * 上传对象构造器
     * @constructor
     * @param {Object} options 初始化配置参数
     */
    var Upload = function (options) {
        initOptions(this, options);
        initUpload(this);
    };
    /**
     * 重新定位上传组件
     */
    Upload.prototype.reposition = function () {
        var point = getPoint(this.baseNode);
        this.uploadContainer.style.left = point.left + 'px';
        this.uploadContainer.style.top = point.top + 'px';
    };
    /**
     * 销毁上传组件
     */
    Upload.prototype.dispose = function () {
        if (this.space) {
            this.baseNode.removeChild(this.space);
        }
        this.uploadContainer.parentNode.removeChild(this.uploadContainer);
    };
    /**
     * 显示上传组件
     */
    Upload.prototype.show = function(){
        this.baseNode.style.display = this.uploadContainer.style.display = 'block';
    };
    /**
     * 隐藏上传组件
     */
    Upload.prototype.hide = function(){
        this.baseNode.style.display = this.uploadContainer.style.display = 'none';
    };
    return Upload;
})();