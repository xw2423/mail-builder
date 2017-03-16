//jquery extend
$.fn.extend({

    getPostData:function(){
        var data = {};
        this.find('input,textarea,select')
            .add(this.filter('input,textarea,select'))
            .each(function(i){
                if($(this).attr('name')){
                    if($(this).is('input[type="checkbox"],input[type="radio"]')){
                        if($(this).is(':checked'))
                            data[$(this).attr('name')] = $(this).val();
                    }else if($(this).is('input[type="file"]')){
                        if(this.files.length)
                            data[$(this).attr('name')] = this;
                    }else if($(this).is('.input-multiple')){
                        data[$(this).attr('name')] = JSON.parse($(this).attr('_value'));
                    }else
                        data[$(this).attr('name')] = $(this).val();
                }
           });
        return data;
    }

    ,getImageSrc:function(){
        if(this.length == 1 && $(this[0]).is('input[type="file"]') && this[0].files.length == 1)
            return window.URL.createObjectURL(this[0].files[0]);
        return '';
    }
});

var MTemplate = function(name){
    var _self = this;

    this._name = name;

    this._category = this._name.split('_')[0];

    this._template = $('#tmpl_' + this._name).html();
    Mustache.parse(this._template);

    this._default_params = {};
    $.each(CONF.template[this._name] || {}, function(k,v){
        if(v.multiple && typeof(v['default']) !== 'object'){
            v['default'] = {};
            for(var i in CONF.NATION){
                v['default'][CONF.NATION[i][0]] = '';
            }
        }
        _self._default_params[v.name] = v['default'];
    });

    this.getName = function(){
        return this._name;
    }

    this.getCategory = function(){
        return this._category;
    }

    this.getDefaultParams = function(k){
        if(typeof(k) === 'undefined')
            return this._default_params;
        return this._default_params['k'];
    }

    this.getParamList = function(){
        return CONF.template[this._name];
    }

    this.render = function(data){
        var d = $.extend({}
            ,this._default_params
            ,{'Template_path':CONF.MTemplate_PATH + '/' + this._name}
            , data || {}
        );
        return $.trim(Mustache.render(this._template, d));
    }
};

var MInstance = function(template, data){
    var _self = this;

    this._template = template;

    this._id = template.getName() + '_' + parseInt(Math.random() * 100000000);

    this.data = data || template.getDefaultParams();

    //only for record
    this.index = 0;

    this.getID = function(){
        return this._id;
    }

    this.getTemplate = function(){
        return this._template;
    }

    this.getCategory = function(){
        return this._template.getCategory();
    }

    this.getParamList = function(nation){
        var d = this._template.getParamList();
        $.each(d, function(k, v){
            if(_self.data[d[k].name] instanceof Object && !(_self.data[d[k].name] instanceof Element)){
                d[k]._value = JSON.stringify(_self.data[d[k].name]);
                d[k].value = _self.data[d[k].name][nation];
            }else
                d[k].value = _self.data[d[k].name];
        })
        return d;
    }

    this.render = function(nation){
        var d = {global:CONF.GLOBAL[nation] || CONF.GLOBAL[CONF.NATION[0][0]]};
        d.global.nation = nation;
        for(var i in this.data){
            if(this.data[i] instanceof Element){
                d[i] = $(this.data[i]).getImageSrc();
            }else if(this.data[i] instanceof Object){
                d[i] = this.data[i][nation || CONF.NATION[0][0]];
            }else
                d[i] = this.data[i];
        }

        return this._template.render(d);
    }

    this.getSerialization = function(project_name){
        var d = {};
        for(var i in this.data){
            if(this.data[i] instanceof Element){
                if(this.data[i].files.length)
                    d[i] = [CONF.WWW, 'projects', project_name, this.data[i].files[0].name].join('/');
                else
                    d[i] = '';
            }else
                d[i] = this.data[i];
        }
        return {template:this.getTemplate().getName(), data:d};
    }

    this.getImage = function(){
        var im = [];
        for(var i in this.data){
            if(this.data[i] instanceof Element){
                im.push(this.data[i]);
            }
        }
        return im;
    }
};

var MProject = function(){
    this._name = null;

    this._modified = false;

    this._instance = {
        framework:null
        ,nav:null
        ,content:[]
    }

    $('body').trigger('new.project');

    this.getInstance = function(id){
        if(typeof(id) === 'undefined')
            return this._instance;
        if(this._instance.framework && this._instance.framework.getID() === id)
            return this._instance.framework;
        if(this._instance.nav && this._instance.nav.getID() === id)
            return this._instance.nav;
        for(var k in this._instance.content){
            if(this._instance.content[k] && this._instance.content[k].getID() === id){
                this._instance.content[k].index = parseInt(k);
                return this._instance.content[k];
            }
        }
        return false;
    }

    this.add = function(ins, index){
        var cate = ins.getCategory();
        switch(cate){
            case 'framework':
                if(this._instance[cate])
                    return false;
                this._instance[cate] = ins;
                index = 0;
                break;
            case 'nav':
                if(this._instance[cate] || !this._instance['framework'])
                    return false;
                this._instance[cate] = ins;
                index = 0;
                break;
            default:
                if(!this._instance['framework'])
                    return false;
                if(typeof(index) === 'undefined' || index < 0 || index > this._instance[cate].length)
                    index = this._instance[cate].length;
                this._instance[cate].splice(index, 0, ins);
        }

        this._modified = true;
        $('body').trigger('modify.project');

        $(CONF.VStructure).trigger('add.project', {ins:ins,index:index})
        $(CONF.VPreview).trigger('add.project', {ins:ins,index:index})

        return true;
    }

    this.update = function(iid, ndata, index){
        var ins = this.getInstance(iid);
        if(!ins) return false;
        $.extend(ins.data, ndata);
        if('content' === ins.getCategory() && typeof(index) !== 'undefined' && index >= 0 && index < this._instance['content'].length){
            if(ins.index != index){
                this._instance['content'][ins.index] = this._instance['content'][index];
                this._instance['content'][index] = ins;
            }
        }

        this._modified = true;
        $('body').trigger('modify.project');

        $(CONF.VStructure).trigger('update.project', {ins:ins,index:typeof(index) !== 'undefined'?index:ins.index,oindex:ins.index});
        $(CONF.VPreview).trigger('update.project', {ins:ins,index:typeof(index) !== 'undefined'?index:ins.index,oindex:ins.index});

        return true;
    }

    this.delete = function(iid){
        var ins = this.getInstance(iid);
        if(!ins) return false;
        var cate = ins.getCategory();
        switch(cate){
            case 'framework':
                if(this._instance['nav'] || this._instance['content'].length)
                    return false;
                delete this._instance[cate];
                this._instance[cate] = null;;
                break;
            case 'nav':
                delete this._instance[cate];
                this._instance[cate] = null;;
                break;
            default:
                delete this._instance[cate][ins.index];
                this._instance[cate].splice(ins.index, 1);
        }

        this._modified = true;
        $('body').trigger('modify.project');

        $(CONF.VStructure).trigger('delete.project',{ins:ins,index:ins.index});
        $(CONF.VPreview).trigger('delete.project', {ins:ins,index:ins.index});

        return true;
    }

    this.isModified = function(){
        return this._modified;
    }

    this.isNew = function(){
        return this._name === null;
    }

    this.hasFramework = function(){
        return !!this._instance['framework'];
    }

    this.getName = function(){
        if(this.isNew()){
            var d = new Date();
            return ['project_'
                ,d.getFullYear()
                ,(d.getMonth() + 1).toString().replace(/^(\d)$/,"0$1")
                ,d.getDate().toString().replace(/^(\d)$/,"0$1")
                ,d.getHours().toString().replace(/^(\d)$/,"0$1")
                ,d.getMinutes().toString().replace(/^(\d)$/,"0$1")
                ,d.getSeconds().toString().replace(/^(\d)$/,"0$1")
                ,d.getMilliseconds().toString().replace(/^(\d)$/, "00$1").replace(/^(\d\d)$/, "0$1")
            ].join('');
        }
        return this._name;
    }

    this.load = function(project){
        this._name = project.name;

        if(project.framework)
            this.add(new MInstance(MB.getTemplate(project.framework.template), project.framework.data));
        if(project.nav)
            this.add(new MInstance(MB.getTemplate(project.nav.template), project.nav.data));
        for(var i in project.content)
            this.add(new MInstance(MB.getTemplate(project.content[i].template), project.content[i].data));

        this._modified = false;
        $('body').trigger('save.project', {name:project.name});
    }

    this.save = function(name){
        if(!this.isModified() || !this.hasFramework())
            return;

        name = name || this.getName();
        var d = {}, im = [];
        d.framework = this._instance['framework'].getSerialization(name);
        $.merge(im, this._instance['framework'].getImage());
        d.nav = null;
        if(this._instance['nav']){
            d.nav = this._instance['nav'].getSerialization(name);
            $.merge(im, this._instance['nav'].getImage());
        }
        d.content = [];
        for(var i in this._instance['content']){
            d.content.push(this._instance['content'][i].getSerialization(name));
            $.merge(im, this._instance['content'][i].getImage());
        }

        var fd = new FormData();
        fd.append('project', name);
        fd.append('projectdata', JSON.stringify(d));
        for(var i in im){
            fd.append(im[i].name + '_' + Math.round(Math.random() * 10000000), im[i].files[0]);
        }

        var self = this;
        $.ajax({
            url: CONF.MSave_URL
            ,type: "POST"
            ,processData: false
            ,contentType: false
            ,dataType:'json'
            ,data: fd
            ,success: function(json){
                self._name = json.name;
                self._modified = false;

                $.extend(self._instance['framework'].data, json.data.framework.data);
                if(self._instance['nav'])
                    $.extend(self._instance['nav'].data, json.data.nav.data);
                for(var i in self._instance['content']){
                    $.extend(self._instance['content'][i].data, json.data.content[i].data);
                }

                $('body').trigger('save.project', {name:json.name});
            }
            ,error: function(){
            }
        });
    }

    this.refresh = function(){
        if(this._instance['framework']){
            $(CONF.VPreview).trigger('update.project', {ins:this._instance['framework'],index:0,oindex:0});
        }
        if(this._instance['nav']){
            $(CONF.VPreview).trigger('update.project', {ins:this._instance['nav'],index:0,oindex:0});
        }
        for(var i in this._instance['content']){
            $(CONF.VPreview).trigger('update.project', {ins:this._instance['content'][i],index:i,oindex:i});
        }
    }

    this.output = function(nation){
        if(this.isNew() || this.isModified())
            return;

        var out = $('<div></div>');
        out.html(this._instance['framework'].render(nation || MB.getNation()));
        if(this._instance['nav']){
            out.find('#nav').html(this._instance['nav'].render(nation || MB.getNation()));
        }
        for(var i in this._instance['content']){
            out.find('#content').append(this._instance['content'][i].render(nation || MB.getNation()));
        }
        return "<meta charset=\"utf-8\">\n" + out.html();
    }
};

var Dialog = {

    el:$('#dialog')

    ,init:function(){
        this.el.modal({'show':false});
        return this;
    }

    ,show:function(title, html, ok){
        this.el.find('.modal-title').html(title || '');
        this.el.find('.modal-body').html(html || '');
        this.el.off('.dialog')
            .on('click.dialog', '#btn_ok', ok || function(){})
            .modal('show');
        return this;
    }

    ,confirm:function(html, ok){
        return this.show('确认', html, ok);
    }

    ,alert:function(msg){
        return this.show('提示', msg);
    }
};

var View = {

    template:[]

    ,init:function(mb){

        var self = this;

        Dialog.init();

        $('.tmpl-main').each(function(k, v){
            Mustache.parse(self.template[v.id] = $(v).html());
        });

        //body init
        $('body').on('click', '#btn_new', function(){
            if(mb.getProject().isNew())
                return;
            if(mb.getProject().isModified())
                Dialog.confirm('当前工程尚未保存，确定放弃当前修改并新建工程吗？',function(){
                    mb.new();
                });
            else
                mb.new();
        }).on('click', '#btn_open', function(){
            var view_open = function(){
                $.getJSON(CONF.MOpen_URL, function(json){
                    var page = Math.ceil(json.length / CONF.MOpen_Page),pages = [];
                    for(var i = 1;i <= page;pages.push(i++));
                    Dialog.show('打开已有工程', Mustache.render(self.template['tmpl_open'], {pages:pages,page:page}),function(){
                        $.getJSON(CONF.MProject_URL, {name:$('#project_list table input[type="radio"]:checked').attr('value')}, function(json){
                            mb.open(json);
                        })
                        return false;
                    }).el.on('click.dialog', '#project_list_pagination a', function(e){
                        $('#project_list_pagination li.active').removeClass('active');
                        $(e.currentTarget).parent().addClass('active');
                        var page = parseInt($(e.currentTarget).parent().attr('page'));
                        $('#project_list table tbody').html(Mustache.render(self.template['tmpl_openitem'], {project:json.slice((page - 1) * CONF.MOpen_Page, page * CONF.MOpen_Page)}));
                    }).on('click.dialog', '#project_list table .open-project-name', function(e){
                        $(e.currentTarget).parent().find('input[type="radio"]').eq(0).click();
                        return false;
                    }).on('click.dialog', '#project_list table .btn-project-delete', function(e){
                        if(window.confirm('确认删除此工程？')){
                            var tr = $(e.currentTarget).parents('tr');
                            $.getJSON(CONF.MRemove_URL, {name:tr.find('input[type="radio"]').attr('value')}, function(json){
                                tr.remove();
                            });
                        }
                        return false;
                    }).find('#project_list_pagination a').eq(0).click();
                });
            }
            if(mb.getProject().isModified())
                Dialog.confirm('当前工程尚未保存，确定放弃当前修改并打开其他工程吗？',function(){
                    view_open();
                });
            else
                view_open();
            return false;
        }).on('click', '#btn_save', function(){
            if(!mb.getProject().isModified())
                return;

            if(!mb.getProject().hasFramework()){
                Dialog.alert('至少需要一个框架');
                return
            }

            Dialog.show('保存', Mustache.render(self.template['tmpl_save'], {name:mb.getProject().getName(), isNew:mb.getProject().isNew()}),function(){
                if(Dialog.el.find('#input_save_name').length)
                    mb.getProject().save(Dialog.el.find('#input_save_name').val());
                else
                    mb.getProject().save();
                return false;
            });
            return;
        }).on('click', '#btn_output', function(e){
            if(mb.getProject().isNew() || mb.getProject().isModified())
                return;

            var zip = new JSZip();
            for(var i in CONF.NATION){
                zip.file(mb.getProject().getName() + '_' + CONF.NATION[i][0] + '.html', mb.getProject().output(CONF.NATION[i][0]));
            }
            saveAs(zip.generate({type:"blob"}), mb.getProject().getName() + '.zip');
            return false;
        }).on('click', '#btn_template', function(){
            Dialog.show('新增实例', Mustache.render(self.template['tmpl_templatelist'], mb.getTemplateList()), function(){
                Dialog.el.find('.list-group-item.active').each(function(k,v){
                    mb.getProject().add(new MInstance(mb.getTemplate($(v).attr('_name'))));
                });
                return false;
            }).el.on('click.dialog', '.list-group-item', function(e){
                $(e.currentTarget).toggleClass('active');
                $(e.currentTarget).children().eq(0).toggleClass('hide');
                return false;
            });
        }).on('click', '#btn_setting', function(){
            var d = {nations:[]}, n = mb.getNation();
            d.selected = function(){
                return this.nation == n;
            }
            for(var i in CONF.NATION){
                d.nations.push({nation:CONF.NATION[i][0], text:CONF.NATION[i][1]});
            }
            Dialog.show('设置', Mustache.render(self.template['tmpl_setting'], d), function(){
                var n = Dialog.el.find('.form-setting').getPostData();
                mb.setNation(n.nation);
            });
        });

        //structure init
        $(CONF.VStructure).on('submit', '.form-update', function(e){
            var t = $(e.currentTarget).attr('id').split('form_'),d = $(e.currentTarget).getPostData();
            mb.getProject().update(t[1], d);
            return false;
        }).on('click', '.btn-delete', function(e){
            Dialog.confirm('确认删除此实例?', function(){
                var t = $(e.currentTarget).attr('id').split('btn_delete_');
                mb.getProject().delete(t[1]);
                return false;
            });
            return false;
        }).on('click', '.glyphicon-remove', function(e){
            $(e.currentTarget).parents('.panel .panel-default').find('.btn-delete').click();
            return false;
        }).on('click', '.glyphicon-circle-arrow-up', function(e){
            var cur = $(e.currentTarget).parents('.panel-content').index(CONF.VStructure + ' .panel-content');
            if(--cur < 0) cur = 0;
            mb.getProject().update($(e.currentTarget).attr('_id'), {}, cur);
        }).on('click', '.glyphicon-circle-arrow-down', function(e){
            var cur = $(e.currentTarget).parents('.panel-content').index(CONF.VStructure + ' .panel-content');
            if(++cur >= $(CONF.VStructure + ' .panel-content').length) cur = $(CONF.VStructure + ' .panel-content').length - 1;
            mb.getProject().update($(e.currentTarget).attr('_id'), {}, cur);
        }).on('click', '.input-multiple', function(e){
            var d = {data: []}, v={}, inp = e.currentTarget;
            if($(inp).attr('_value'))
                v = JSON.parse($(inp).attr('_value'))
            for(var i in CONF.NATION){
                d.data.push({nation:CONF.NATION[i][0], text:CONF.NATION[i][1], value:v[CONF.NATION[i][0]] || ''});
            }

            Dialog.show('多国家设置', Mustache.render(self.template['tmpl_multiple_nation'], d), function(e){
                var d = Dialog.el.find('.form-multiple-nation').getPostData();
                $(inp).attr('_value', JSON.stringify(d));
                $(inp).val(d[mb.getNation()]);
            }).el.on('keyup', '#input_multiple_nation_' + CONF.NATION[0][0], function(e){
                Dialog.el.find('input[type="text"]').val($(e.currentTarget).val());
                return false;
            });
        });

        //listener
        $('body').on('add.project', CONF.VStructure, this.on_structure_add);
        $('body').on('update.project', CONF.VStructure, this.on_structure_update);
        $('body').on('delete.project', CONF.VStructure, this.on_structure_delete);
        $('body').on('nation.project', CONF.VStructure, this.on_structure_nation);
        $('body').on('add.project', CONF.VPreview, this.on_preview_add);
        $('body').on('update.project', CONF.VPreview, this.on_preview_update);
        $('body').on('delete.project', CONF.VPreview, this.on_preview_delete);
        $('body').on('nation.project', CONF.VPreview, this.on_preview_nation);
        $('body').on('new.project', this.on_project_new);
        $('body').on('modify.project', this.on_project_modify);
        $('body').on('save.project', this.on_project_save);
    }

    ,on_structure_add:function(evt, data){
        var d = {
            id:data.ins.getID()
            ,title:CONF.CATEGORY[data.ins.getCategory()] + ':' + data.ins.getTemplate().getName()
            ,params:data.ins.getParamList(MB.getNation())
        };
        if('framework' === data.ins.getCategory()){
            $(CONF.VStructure).prepend(Mustache.render(View.template['tmpl_accordion'], d));
        }else if('nav' === data.ins.getCategory()){
            $(CONF.VStructure).children().eq(0).after(Mustache.render(View.template['tmpl_accordion'], d));
        }else{
            d.content = true;
            $(CONF.VStructure).append(Mustache.render(View.template['tmpl_accordion'], d));
        }
        // $('#heading_' + d.id).find('.panel-title>a').click();
        return false;
    }

    ,on_structure_update:function(evt, data){
        if('content' === data.ins.getCategory() && data.index != data.oindex){
            var d = {
                id:data.ins.getID()
                ,title:CONF.CATEGORY[data.ins.getCategory()] + ':' + data.ins.getTemplate().getName()
                ,params:data.ins.getParamList(MB.getNation())
                ,content:true
            };
            var l = $(CONF.VStructure + ' .panel-content').length
                ,oel = $(CONF.VStructure + ' .panel-content').eq(data.oindex)
                ,oel_html = oel.wrap('<div></div>').parent().html();

            oel.parent().remove();
            if(data.index == l - 1)
                $(CONF.VStructure).append(Mustache.render(View.template['tmpl_accordion'], d));
            else
                $(CONF.VStructure + ' .panel-content').eq(data.index).before(Mustache.render(View.template['tmpl_accordion'], d));
        }
    }

    ,on_structure_delete:function(evt, data){
        $('#panel_' + data.ins.getID()).remove();
    }

    ,on_structure_nation:function(evt, data){
        $(CONF.VStructure + ' .input-multiple').each(function(i, el){
            var d = JSON.parse($(el).attr('_value'));
            $(el).val(d[data.nation]);
        });
    }

    ,on_preview_add:function(evt, data){
        if('framework' === data.ins.getCategory()){
            $(CONF.VPreview).html(data.ins.render(MB.getNation()));
        }else if('nav' === data.ins.getCategory()){
            $(CONF.VPreview + ' #nav').html(data.ins.render(MB.getNation()));
        }else{
            var l = $(CONF.VPreview + ' #content').children().length;
            if(data.index == l)
                $(CONF.VPreview + ' #content').append(data.ins.render(MB.getNation()));
            else
                $(CONF.VPreview + ' #content').children().eq(data.index).before(data.ins.render(MB.getNation()));
        }
    }

    ,on_preview_update:function(evt, data){
        if('framework' === data.ins.getCategory()){
            var nav = $('#nav').html(),content = $('#content').html();
            $(CONF.VPreview).html(data.ins.render(MB.getNation()));
            $(CONF.VPreview + ' #nav').html(nav);
            $(CONF.VPreview + ' #content').html(content);
        }else if('nav' === data.ins.getCategory()){
            $(CONF.VPreview + ' #nav').html(data.ins.render(MB.getNation()));
        }else{
            var l = $(CONF.VPreview + ' #content').children().length;
            if(data.index === data.oindex)
                $(CONF.VPreview + ' #content').children().eq(data.index).html(data.ins.render(MB.getNation()));
            else{
                $(CONF.VPreview + ' #content').children().eq(data.oindex).remove();
                if(data.index == l - 1)
                    $(CONF.VPreview + ' #content').append(data.ins.render(MB.getNation()));
                else
                    $(CONF.VPreview + ' #content').children().eq(data.index).before(data.ins.render(MB.getNation()));
            }
        }
    }

    ,on_preview_delete:function(evt, data){
        if('framework' === data.ins.getCategory()){
            $(CONF.VPreview).empty()
        }else if('nav' === data.ins.getCategory()){
            $(CONF.VPreview + ' #nav').empty();
        }else{
            $(CONF.VPreview + ' #content').children().eq(data.index).remove();
        }
    }

    ,on_preview_nation:function(evt, data){
        var text = '';
        for(var i in CONF.NATION){
            if(data.nation == CONF.NATION[i][0]){
                text = CONF.NATION[i][1];
                break;
            }
        }
        $('#preview_nation').html(text);
        MB.getProject().refresh();
    }

    ,on_project_new:function(evt){
        $(CONF.VStructure).empty();
        $(CONF.VPreview).empty();
        $('#btn_new').parent().addClass('disabled');
        $('#btn_save').parent().addClass('disabled');
        $('#btn_output').parent().addClass('disabled');
        $('#project_name').html('未命名的工程');
    }

    ,on_project_modify:function(evt){
        $('#btn_new').parent().removeClass('disabled');
        $('#btn_save').parent().removeClass('disabled');
        $('#btn_output').parent().addClass('disabled');
    }

    ,on_project_save:function(evt, data){
        $('#btn_new').parent().removeClass('disabled');
        $('#btn_save').parent().addClass('disabled');
        $('#btn_output').parent().removeClass('disabled');
        $('#project_name').html(data.name);
    }
};

var MB = {

    _templates:{}

    ,_project:null

    ,_nation:''

    ,init:function(){

        CONF.MTemplate_PATH = CONF.WWW + '/' + CONF.MTemplate_DIR;
        CONF.NATION_default = {};
        for(var i in CONF.NATION){
            CONF.NATION_default[CONF.NATION[i][0]] =  '';
        }

        View.init(MB);
        this.new();
        this.setNation(CONF.NATION[0][0]);
    }

    ,getNation:function(){
        return this._nation;
    }

    ,setNation:function(nation){
        this._nation = nation;
        $(CONF.VStructure).trigger('nation.project', {nation:nation});
        $(CONF.VPreview).trigger('nation.project', {nation:nation});
    }

    ,getTemplateList:function(){
        if(null === CONF.templateList){
            CONF.templateList = {};
            for(var k in CONF._templateList){
                var c = CONF._templateList[k].split('_', 1)[0];
                if(!CONF.templateList[c]) CONF.templateList[c] = [];
                CONF.templateList[c].push({
                    name: CONF._templateList[k]
                    ,count:CONF.template[CONF._templateList[k]].length
                });
            }
        }
        return CONF.templateList;
    }

    ,getTemplate:function(name){
        if(!this._templates[name]);
            this._templates[name] = new MTemplate(name)
        return this._templates[name];
    }

    ,getProject:function(){
        return this._project;
    }

    ,new:function(){
        this._project = new MProject();
    }

    ,open:function(project){
        this._project = new MProject();

        this._project.load(project);
    }
};

$(function(){
    MB.init();
    // MB.getProject().add(new MInstance(MB.getTemplate('framework_new')));
    // MB.getProject().add(new MInstance(MB.getTemplate('content_single')));
    // MB.getProject().add(new MInstance(MB.getTemplate('content_title')));
    // MB.getProject().add(new MInstance(MB.getTemplate('nav_1')));
});
