var UserProfilePictureComponent = (function($) {
    var scope = {}, defaultPic, ele;
    var template = ['<div id="profileUser">', '<div class="userDetails">', '<span class="userWelcome">Olá,', '</span>', '<span class="userName">', '{{name}}', '</span>', '</div>', '<div class="userPic {{classe}}">', '<img id="ProfileImage" data-ng-src="{{img}}" alt="{{alt}}" />', '</div>', '</div>']
    function SharePointGetUser(userID) {
        var deferred = $.Deferred();
        SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function() {
            var context = new SP.ClientContext(_spPageContextInfo.webAbsoluteUrl)
            var web = context.get_web();
            var userInfoList = web.get_siteUserInfoList();
            var camlQuery = new SP.CamlQuery();
            camlQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name="ID"/><Value Type="Number">' + userID + '</Value></Eq></Where></Query><RowLimit>1</RowLimit></View>');
            CamlResult = userInfoList.getItems(camlQuery);
            context.load(CamlResult);
            context.executeQueryAsync(function() {
                deferred.resolve(CamlResult);
            }, function() {
                deferred.reject();
            });
        })
        return deferred.promise();
    }

    function successCallback(CamlResult) {
        var profile, title, login, email, pic, picUrl;
        profile = CamlResult.itemAt(0);
        title = profile.get_item('Title');
        login = profile.get_item("Name");
        email = profile.get_item("EMail");
        pic = profile.get_item('Picture');
        if (pic) {
            picUrl = pic.get_url();
        }
        scope.name = title
        scope.img = picUrl || scope.img;
        scope.alt = title + " User Profile Image";
        scope.classe = "ss-profile-image";
    }
    function failCallback() {
        scope.img = defaultPic;
    }
    function getTemplate() {
        return template
            .join('')
            .replace('{{name}}', scope.name)
            .replace('{{classe}}', scope.classe)
            .replace('{{img}}', scope.img)
            .replace('{{alt}}', scope.alt)
    }
    function render() {
        var html = getTemplate();
        $(ele).html(html)
    }
    return function UserProfilePicture(element, callbackPic) {
        /**
         * params
         * @element elemento que vai receber o html
         * @callbackPic imagem para callback caso usuario nao tenha imagem
         */
        ele = element;
        defaultPic = callbackPic || "/Style%20Library/images/PersonPlaceholder.png";
        SharePointGetUser(_spPageContextInfo.userId)
            .then(successCallback)
            .then(render)
            .fail(failCallback)
    };
})($);

_spBodyOnLoadFunctionNames.push("UserProfilePictureComponent.bind(null, '#holdHead', '/Style Library/images/PersonPlaceholder.png'')");
