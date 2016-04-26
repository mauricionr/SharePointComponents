/* global _spPageContextInfo */
/* global jQuery */
; var JqueryMenu = (function($) {
    return function Menu() {
        function GetData(data) {
            try {
                var ospais = data
                var response = [];
                for (var x = 0, pai; pai = ospais[x]; x++) {
                    var paiInfo = getTextAndUrl(pai)
                    var objPai = initObject(paiInfo)
                    if (objPai) {
                        var kombiComFilhos = pai.childNodes[1]
                        if (kombiComFilhos) {
                            var filhos = kombiComFilhos.childNodes
                            var totalFilhos = filhos.length
                            objPai.temFilhos = totalFilhos > 0
                            while (totalFilhos--) {
                                var filho = filhos[totalFilhos]
                                if (filho.tagName === 'LI') {
                                    var filhoInfo = getTextAndUrl(filho)
                                    var objFilho = initObject(filhoInfo)
                                    objPai.filhos.push(objFilho)
                                }
                                if (filho.childNodes[1]) {
                                    filho.filhos = OrganizeMenu(filho.childNodes[1].childNodes)
                                }
                            }
                        }
                        response.push(objPai)
                    }
                }
            } catch (e) {
                ///
            }
            return response
        }
        function OrganizeMenu(data, parentTag, id, classe) {
            var response = GetData(data);
            return generateMenu(response.reverse(), parentTag, id, classe)
        }
        function initObject(info) {
            return { Title: info.text, url: info.url, filhos: [] }
        }
        function getTextAndUrl(obj) {
            var text = $(obj).find('a:first > span span:first').text()
            var url = $(obj).find('a:first').attr('href')
            return { text: text, url: url }
        }
        function menuFn(pai, template) {
            template.push(getLi(pai.Title, pai.url, pai.temFilhos))
            if (pai.temFilhos) {
                var totalFilhos = pai.filhos.length
                template.push(startUl("", "menu"))
                while (totalFilhos--) {
                    var filho = pai.filhos[totalFilhos]
                    template.push(getLi(filho.Title, filho.url, filho.temFilhos))
                }
                template.push(endUl())
                if (pai.temFilhos) {
                    template.push(endLi());
                }
            }
            return template
        }
        function endLi() {
            return '</li>'
        }
        function generateMenu(pais, parentTag, id, classe) {
            var template = [start(parentTag, id, classe), startUl()]
            var paisTotal = pais.length;
            while (paisTotal--) {
                var pai = pais[paisTotal]
                template = menuFn(pai, template)
            }
            template.push(endUl())
            template.push(end(parentTag))
            return { htmlData: template.join(""), dataAsArray: template };
        }
        function getLi(Title, Url, temFilhos) {
            var tmpl = []
            tmpl.push('<li>')
            tmpl.push('<a href="' + Url + '">')
            tmpl.push(Title)
            tmpl.push('</a>')
            if (!temFilhos) {
                tmpl.push('</li>')
            }
            return tmpl.join("")
        }
        function startUl(id, classe) {
            var info = checkIdAndClasses(id, classe);
            return '<ul id="' + info.id + '" class="' + info.classe + '">'
        }
        function endUl() {
            return '</ul>'
        }
        function start(tag, id, classe) {
            var info = checkIdAndClasses(id, classe)
            return '<' + tag + ' id="' + info.id + '" class="' + info.classe + '">'
        }
        function end(tag) {
            return '</' + tag + '>'
        }
        function checkIdAndClasses(id, classes) {
            return { id: id || "", classe: classes || "" }
        }
        function initialize(parentTag, parentTagId, tagClasses, target, dataTarget) {
            var data = $(dataTarget)
            var MenuTpl = OrganizeMenu(data, parentTag, parentTagId, tagClasses)
            $(target).append(MenuTpl.htmlData)
            $('[href="' + _spPageContextInfo.serverRequestPath + '"]').parent('li').addClass('mm-selected')
            if (parentTag === 'nav') {
                $('nav.menu').mmenu();
            }
        }
        return { initialize: initialize }
    }
})(jQuery);

(function($) {
    $(function() {
        var MenuFn = new JqueryMenu();
        MenuFn.initialize('nav', 'menu-left', 'menu', '#s4-workspace', '#s4-bodyContainer #DeltaTopNavigation ul.root.ms-core-listMenu-root > li > ul > li');
    });
})(jQuery);