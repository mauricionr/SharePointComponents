; (function (angular) {
    angular.module('SharePoint', ['ngResource'])
        .config(function ($httpProvider) {
            $httpProvider.defaults.headers.common.Accept = "application/json;odata=verbose";
            $httpProvider.defaults.headers.post['Content-Type'] = 'application/json;odata=verbose';
            $httpProvider.defaults.headers.post['X-Requested-With'] = 'XMLHttpRequest';
            $httpProvider.defaults.headers.post['If-Match'] = "*";
        })
        .factory('GetHeader', function () {
            return _headers
        });


    angular.module('SharePoint').service('GetListsItems', function ($q) {
        return function (listTitle, rowLimit) {
            this.rowLimit = rowLimit;
            this.listTitle = listTitle;
            this.listItems = null;
            this.query = null;
            this.clientContext = null;
            this.targetList = null;
            this.position = null;
            this.page = 0;
            this.position0 = 'Paged=TRUE&p_ID=0';
            this.nextPagingInfo = null;
            this.prevPagingInfo = null;
            this.showPrevPagingInfo = false;
            this.showNextPagingInfo = true;
            this.positionX = function (ID) {
                if (ID < 0) {
                    ID = 0;
                    this.showNextPagingInfo = false;
                } else {
                    this.showNextPagingInfo = true;
                }
                return ['Paged=TRUE&p_ID=', ID].join('');
            }

            this.getPage = function () {
                if (this.position !== null) {
                    this.page = (parseInt((this.lastID / this.rowLimit), 10));
                    this.page = this.rowLimit === this.page ? 1 : this.page;
                    this.showPrevPagingInfo = this.page === 1 ? false : true;
                    this.showNextPagingInfo = true;
                } else {
                    if (this.page > 1) {
                        this.showPrevPagingInfo = true;
                        this.showNextPagingInfo = false;
                    } else {
                        this.page = 1;
                        this.showPrevPagingInfo = false;
                    }
                }
                return this.page
            }

            this.updatePosition = function (NextOrPrev, Rows) {
                this.position = this.position || new SP.ListItemCollectionPosition();
                switch (NextOrPrev) {
                    case 'next':
                        this.nextPagingInfo = this.positionX(this.lastID);
                        this.prevPagingInfo = this.positionX(this.prevID);
                        this.position.set_pagingInfo(this.nextPagingInfo);
                        this.page++
                        break
                    case 'prev':
                        this.nextPagingInfo = this.positionX(this.lastID - this.rowLimit);
                        this.prevPagingInfo = this.positionX(this.prevID - this.rowLimit);
                        this.position.set_pagingInfo(this.prevPagingInfo);
                        this.page--
                        break
                    case 'first':
                        this.position.set_pagingInfo(this.position0);
                        this.page = 1;
                        break
                }
                this.nextPagingInfo = Rows === this.rowLimit;
            }

            this.get = function (NextOrPrev, Query) {
                this.defer = $q.defer()
                SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
                    this.clientContext = new SP.ClientContext();
                    this.targetList = this.clientContext.get_web().get_lists().getByTitle(this.listTitle);
                    this.query = new SP.CamlQuery();
                    this.query.set_viewXml(this.caml(Query));
                    //this.updatePosition(NextOrPrev);
                    this.query.set_listItemCollectionPosition(this.position);
                    this.listItems = this.targetList.getItems(this.query);
                    this.clientContext.load(this.listItems);
                    this.clientContext.executeQueryAsync(
                        Function.createDelegate(this, function () {
                            var response = []
                            var listEnumerator = this.listItems.getEnumerator();
                            while (listEnumerator.moveNext()) {
                                response.push(listEnumerator.get_current().get_objectData().get_methodReturnObjects().$m_dict)
                            }
                            this.updatePosition(NextOrPrev, response.length);
                            this.position = this.listItems.get_listItemCollectionPosition();
                            if (this.position != null) {
                                this.lastID = (parseInt(this.position.get_pagingInfo().split('p_ID=')[1], 10))
                            }
                            this.prevID = (this.position !== null ? this.lastID - this.rowLimit : this.lastID ? this.lastID : 0).toString();
                            this.defer.resolve(response);
                        }.bind(this)),
                        Function.createDelegate(this, function (sender, args) {
                            console.log('Request failed. \nError: ' + args.get_message() + '\nStackTrace: ' + args.get_stackTrace());
                            this.defer.reject(args);
                        }.bind(this))
                    );
                }.bind(this))
                return this.defer.promise;
            }
            this.caml = function (Query) {
                var str = ["<View>",
                    "<ViewFields>",
                    "<FieldRef Name='LinkTitle'/>",
                    "<FieldRef Name='Questoes'/>",
                    "<FieldRef Name='ExibirResultado'/>",
                    "<FieldRef Name='Frases'/>",
                    "<FieldRef Name='Attachments'/>",
                    "<FieldRef Name='Created'/>",
                    "<FieldRef Name='Author'/>",
                    "<FieldRef Name='ID'/>",
                    "<FieldRef Name='Modified'/>",
                    "<FieldRef Name='Editor'/>",
                    "<FieldRef Name='ContentType'/>",
                    "<FieldRef Name='Title'/>",
                    "</ViewFields>"].join('');

                if (Query) {
                    str += [
                        '<Query>',
                        '<Where>',
                        '<Contains>',
                        '<FieldRef Name="Title"/>',
                        '<Value Type="Text">',
                        Query,
                        '</Value>',
                        '</Contains>',
                        '</Where>',
                        '</Query>'
                    ].join('')
                }
                str += ["<RowLimit>", this.rowLimit, "</RowLimit>", "</View>"].join("");
                return str;
            }
        }
    })

    angular.module('SharePoint').factory('Lists', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/lists?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('List', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle(':listName')?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('ListItem', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle(':listName')/items(:itemID)?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('ListItems', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle(':listName')/items?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('ListFields', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/lists/getbytitle(':listName')/fields?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('SiteUsers', ['$resource', 'GetHeader', function ($resource, GetHeader) {
        return $resource(_spPageContextInfo.webAbsoluteUrl + "/_api/web/SiteUsers?:odata", null, GetHeader());
    }]);
    angular.module('SharePoint').factory('SPUtils', function ($http, $q) {
        function sendEmail(from, to, body, subject) {
            var defer = $q.defer()
            if (to) {
                $http.defaults.headers.common.Accept = "application/json;odata=verbose";
                $http.defaults.headers.post['Content-Type'] = 'application/json;odata=verbose';
                $http.defaults.headers.post['X-RequestDigest'] = document.querySelector("#__REQUESTDIGEST").value;
                var urlTemplate = _spPageContextInfo.webAbsoluteUrl + "/_api/SP.Utilities.Utility.SendEmail";
                var emailObj = JSON.stringify({ 'properties': { '__metadata': { 'type': 'SP.Utilities.EmailProperties' }, 'From': from, 'To': { 'results': [to] }, 'Body': body, 'Subject': subject } })
                $http.post(urlTemplate, emailObj).then(defer.resolve, defer.reject);
            } else {
                setTimeout(function () {
                    defer.resolve()
                }, 500)
            }
            return defer.promise;
        }
        return {
            sendEmail: sendEmail
        }
    });
    angular.module('SharePoint')
        .factory("DateString", function () {
            return function loadFilter() {
                function getDayAsString(d) {
                    return "'" + moment().year() + "-" + (moment().month() + 1) + "-" + d + "T00:00:00" + "'"
                }
                function getAniversariantesOdata() {
                    return "$filter=(Birthday ge " + getDayAsString(moment().date()) + " and Birthday le " + getDayAsString(moment().endOf('month').date()) + ")"
                }
                return getAniversariantesOdata() + "&$expand=FieldValuesAsHtml&$orderby=Birthday asc"
            }
        })
        .factory('RestGetItemsByUserGroup', function ($http, $q) {
            return function (Title, Odata, FilterColumn) {
                $http.defaults.headers.common['Accept'] = 'application/json;odata=verbose';
                var baseUrl = window.location.protocol + "//" + window.location.host + "/_api/web"
                function getListItems(Title, Odata) {
                    var defer = $q.defer()
                    getUserInfo().then(function (response) {
                        Odata = mountFilter(response.data.d, response.data.d.Groups.results, Odata, FilterColumn)
                        var requestUrl = baseUrl + "/lists/getbytitle('" + Title + "')/items?" + Odata
                        $http.get(requestUrl).then(defer.resolve, defer.reject)
                    })
                    return defer.promise
                }
                function mountFilter(User, Groups, Odata, FilterColumn) {
                    if (!FilterColumn) return Odata;
                    var or = " or "
                    var eq = " eq "
                    var geq = "(" + FilterColumn + eq
                    var _filter = ["$filtre=", geq + "null)", or]
                    _filter = Groups.reduce(function (retorno, current, index, array) {
                        if (index > 0) retorno.push(or)
                        retorno.push(geq + current.Id + ')')
                        return retorno
                    }, _filter).join("")
                    return Odata + '&' + _filter;
                }
                function getPart(part, OdataArray) {
                    return OdataArray[OdataArray.indexOf(part) + 1];
                }
                function getUserInfo() {
                    return $http.get(baseUrl + '/currentuser?$expand=Groups,Groups/Users')
                }
                return getListItems(Title, Odata)
            }
        })
        .factory('LocalStorage', function () {
            return window.localStorage;
        })
        .factory('RestGetItems', function ($q, $http) {
            $http.defaults.headers.common['Accept'] = 'application/json;odata=verbose';
            return function (Title, Odata, SiteUrl) {
                var baseUrl = window.location.protocol + '//' + window.location.hostname

                if (window.location.port) {
                    baseUrl += ':' + window.location.port
                }

                baseUrl += "/_api/web";
                var defer = $q.defer()
                var requestUrl = baseUrl + "/lists/getbytitle('" + Title + "')/items?" + Odata || ''
                $http.get(requestUrl).then(defer.resolve, defer.reject)
                return defer.promise
            }
        })
        .factory('RestGetItem', function ($q, $http) {
            $http.defaults.headers.common['Accept'] = 'application/json;odata=verbose';
            var baseUrl = _spPageContextInfo.webAbsoluteUrl + "/_api/web"
            return function (Title, ID, Odata) {
                var defer = $q.defer()
                var requestUrl = baseUrl + "/lists/getbytitle('" + Title + "')/items(" + ID + ")?" + Odata
                $http.get(requestUrl)
                    .then(defer.resolve, defer.reject)
                return defer.promise
            }
        })
        .factory('ClientContextGetItems', function ($q) {
            return function (Title, CamlQuery, Url) {
                var defer = $q.defer();
                SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () {
                    var baseUrl = Url || window.location.protocol + "//" + window.location.host
                    var clientContext = new SP.ClientContext(baseUrl);
                    var oList = clientContext.get_web().get_lists().getByTitle(Title);
                    var camlQuery = new SP.CamlQuery();
                    camlQuery.set_viewXml(CamlQuery);
                    var collListItem = oList.getItems(camlQuery);
                    clientContext.load(collListItem);
                    function onQuerySucceeded(sender, args) {
                        var response = []
                        var listItemEnumerator = collListItem.getEnumerator();
                        while (listItemEnumerator.moveNext()) {
                            var current = listItemEnumerator.get_current();
                            var oListItem = current.get_fieldValues()
                            if (oListItem.PublishingRollupImage) {
                                oListItem.PublishingRollupImage = angular.element(oListItem.PublishingRollupImage).attr('src')
                                oListItem.Icone = oListItem.UrlIcone
                            }
                            if (oListItem.PublishingPageImage) {
                                oListItem.PublishingPageImage = angular.element(oListItem.PublishingPageImage).attr('src')
                            }
                            response.push(oListItem)
                        }
                        defer.resolve(response)
                    }
                    function onQueryFailed(sender, args) {
                        console.log(args.get_message())
                        defer.resolve([])
                    }
                    clientContext.executeQueryAsync(Function.createDelegate(this, onQuerySucceeded), Function.createDelegate(this, onQueryFailed));
                })
                return defer.promise
            }
        })
        .factory('AddRangeOverlap', function () {
            return function () {
                return [
                    '<DateRangesOverlap>',
                    '<FieldRef Name="EventDate"/>',
                    '<FieldRef Name="EndDate"/>',
                    '<FieldRef Name="RecurrenceID"/>',
                    '<Value Type="DateTime">',
                    '<Month/>',
                    '</Value>',
                    '</DateRangesOverlap>'
                ].join('')
            }
        })
        .factory('AddMemberShip', function () {
            return function () {
                return [
                    '<Membership Type="CurrentUserGroups">',
                    '<FieldRef Name="Publico"/>',
                    '</Membership>',
                    '<Includes>',
                    '<FieldRef Name="Publico"/>',
                    '<Value Type="Integer">',
                    '<UserID Type="Integer"/>',
                    '</Value>',
                    '</Includes>'
                ].join('')
            }
        })
        .factory('GetMidiasCaml', function () {
            return function (ContenType, RowLimit) {
                var caml = ['<View>',
                    '<Query>',
                    '<OrderBy>',
                    '<FieldRef Name="Modified" Ascending="FALSE" />',
                    '</OrderBy>',
                    '<Where>',
                    '<And>',
                    '<Eq>',
                    '<FieldRef Name="ContentType" />',
                    '<Value Type="Computed">', ContenType, '</Value>',
                    '</Eq>',
                    '<Eq>',
                    '<FieldRef Name="Destaque" />',
                    '<Value Type="Boolean">1</Value>',
                    '</Eq>',
                    '</And>',
                    '</Where>',
                    '</Query>',
                    '<RowLimit>2</RowLimit>',
                    '</View>']

                return caml.join("")
            }
        })
        .service('LoadingInterceptor', ['$q', '$rootScope', '$log', function ($q, $rootScope, $log) {
            'use strict';
            var xhrCreations;
            var xhrResolutions
            var completed = false;
            function resetXhr() {
                xhrCreations = 0;
                xhrResolutions = 0;
            }
            resetXhr()
            function isLoading() {
                var loading = xhrResolutions < xhrCreations;
                return loading;
            }
            function updateStatus() {
                var loading = isLoading();
                if (xhrCreations === 1) {
                    if (completed) {
                        $rootScope.loading = false
                        resetXhr()
                    }
                } else if (!loading) {
                    resetXhr()
                    setTimeout(function () {
                        $rootScope.loading = loading;
                        completed = true
                    }, 600)
                } else {
                    $rootScope.loading = loading;
                }
            }
            return {
                request: function (config) {
                    xhrCreations++;
                    updateStatus();
                    return config;
                },
                requestError: function (rejection) {
                    xhrResolutions++;
                    updateStatus();
                    $log.error('Request error:', rejection);
                    return $q.reject(rejection);
                },
                response: function (response) {
                    xhrResolutions++;
                    updateStatus();
                    return response;
                },
                responseError: function (rejection) {
                    xhrResolutions++;
                    updateStatus();
                    $log.error('Response error:', rejection);
                    return $q.reject(rejection);
                }
            };
        }])
        .factory('GetCamlStartDateEndDateByGroup', function () {
            return function (StartDate, EndDate, OrderBy, Destaque, RowLimit) {
                return ['<View>',
                    '<Query>',
                    '<OrderBy>',
                    '<FieldRef Name="', OrderBy, '" Ascending="FALSE" />',
                    '</OrderBy>',
                    '<Where>',
                    '<And>',
                    '<And>',
                    '<And>',
                    '<Leq>',
                    '<FieldRef Name="', StartDate, '" />',
                    '<Value Type="DateTime">',
                    '<Today/>',
                    '</Value>',
                    '</Leq>',
                    '<Geq>',
                    '<FieldRef Name="', EndDate, '" />',
                    '<Value Type="DateTime">',
                    '<Today/>',
                    '</Value>',
                    '</Geq>',
                    '</And>',
                    '<Eq>',
                    '<FieldRef Name="', Destaque, '" />',
                    '<Value Type="Boolean">1</Value>',
                    '</Eq>',
                    '</And>',
                    '<Or>',
                    '<Or>',
                    '<Membership Type="CurrentUserGroups">',
                    '<FieldRef Name="Publico" />',
                    '</Membership>',
                    '<Includes>',
                    '<FieldRef Name="Publico" />',
                    '<Value Type="Integer">',
                    '<UserID Type="Integer" />',
                    '</Value>',
                    '</Includes>',
                    '</Or>',
                    '<IsNull>',
                    '<FieldRef Name="Publico" />',
                    ',</IsNull>',
                    '</Or>',
                    '</And>',
                    '</Where>',
                    '</Query>',
                    '<RowLimit>', RowLimit, '</RowLimit>',
                    '</View>'
                ].join("")
            }
        }).factory('O365', function ($q, $http, $resource) {
            var _self = this
            _self.actions = { folderAction: "web/GetFolderByServerRelativeUrl", fileAction: "web/GetFileByServerRelativeUrl" };
            _self.appInfo = {};
            _self.appweburl = _spPageContextInfo.webAbsoluteUrl;
            _self.socialEndPoint = "/_api/social.following/";
            _self.followMessages = { 0: 'The user has started following the document. ', 1: 'The user is already following the document. ', 2: 'An internal limit was reached. ', 3: 'An internal error occurred. ' };
            _self.POST_HEADER = { headers: { 'accept': 'application/json;odata=verbose', 'content-type': 'application/json;odata=verbose', 'X-RequestDigest': document.getElementById('__REQUESTDIGEST').value } };
            _self.appInfo.shareRoles = [{ name: "View", id: 1 }, { name: "Edit", id: 2 }, { name: "Owner", id: 3 }];
            _self.target = null;
            function getMyFollowedContent() {
                var defer = $q.defer();
                var call = $http.get(_self.appweburl + _self.socialEndPoint + "my/followed(types=14)")
                call.then(defer.resolve, defer.reject);
                return defer.promise
            }
            function folowContent(file, action) {
                var defer = $q.defer()
                var endpoint = _spPageContextInfo.webAbsoluteUrl + _self.socialEndPoint + action;
                var config = _self.POST_HEADER
                var data = JSON.stringify({
                    "actor": {
                        "__metadata": {
                            "type": "SP.Social.SocialActorInfo"
                        },
                        "ActorType": 1,
                        "ContentUri": getTarget() + file.ServerRelativeUrl,
                        "Id": null
                    }
                });
                var call = $http.post(endpoint, data, config);
                call.then(function (responseData) {
                    stringData = JSON.stringify(responseData);
                    jsonObject = JSON.parse(stringData);
                    defer.resolve(jsonObject.data.d.IsFollowed || jsonObject.data.d.Follow === 0 || jsonObject.data.d.Follow === 1 || false);
                }, function (response) {
                    defer.reject(response)
                })
                return defer.promise
            }
            function getShareRoles() {
                return _self.appInfo.shareRoles;
            }
            function discoveryUsers() {
                var defer = $q.defer()
                var call = $http.get(_spPageContextInfo.webAbsoluteUrl + '/_api/web/SiteUsers/')
                call.then(function (response) {
                    _self.appInfo.AllUsers = response.data.value
                    defer.resolve(response.data.value)
                }, defer.reject)
                return defer.promise
            }
            function share(file, userRoleAssignments, customMessage, sendServerManagedNotification, includeAnonymousLinksInNotification) {
                appweburl = _spPageContextInfo.webAbsoluteUrl
                var restQueryUrl = appweburl + "/_api/SP.Sharing.DocumentSharingManager.UpdateDocumentSharingInfo/"
                var defer = $q.defer();
                var config = _self.POST_HEADER
                for (var x = 0, item; item = userRoleAssignments[x]; x++) {
                    item = angular.extend({}, item, { '__metadata': { 'type': 'SP.Sharing.UserRoleAssignment' } })
                }
                var JsonStringData = {
                    'resourceAddress': file.__metadata.uri,
                    'userRoleAssignments': userRoleAssignments,
                    'validateExistingPermissions': false,
                    'additiveMode': true,
                    'sendServerManagedNotification': sendServerManagedNotification || false,
                    'customMessage': customMessage || "",
                    'includeAnonymousLinksInNotification': includeAnonymousLinksInNotification || false
                };
                var shareCall = $http.post(restQueryUrl, JsonStringData, config)
                shareCall.then(function (data) {
                    defer.resolve(data)
                }, function (err) {
                    defer.reject(err)
                })
                return defer.promise
            };
            function copyTo(item, newPath, overwrite) {
                if (!overwrite) overwrite = true;
                if (!newPath) newPath = "/Documents/";
                newPath += item.Name
                fileName = item.Name
                defer = $q.defer();
                fileToCopy = getFileById(item.UniqueId).then(function (data) {
                    _file = data.spFile;
                    context = data.context;
                    _file.copyTo(_self.onedrive + "/Documents/media/" + fileName, true);
                    context.executeQueryAsync(
                        function (sender, args) {
                            defer.resolve(sender);
                        },
                        function (sender, args) {
                            defer.reject(args);
                        }
                    );
                })
                return defer.promise;
            }
            function getFileById(file) {
                defer = $q.defer()

                if (!file.UniqueId) { _file = {}; _file.UniqueId = file; file = _file; }

                context = new SP.ClientContext(_spPageContextInfo.webAbsoluteUrl)
                parentContext = new SP.AppContextSite(context, getOneDriveUrl());
                web = parentContext.get_web();
                context.load(web);
                site = parentContext.get_site();
                context.load(site);
                context.executeQueryAsync(
                    function (sender, args) {
                        _file = web.getFileById(file.UniqueId)
                        context.load(_file)
                        context.executeQueryAsync(function (sender, args) {
                            _f = _file.get_objectData().get_properties()
                            defer.resolve({ fileData: _f, spFile: _file, context: context })
                        }, function (sender, args) {
                            defer.reject(arguments)
                        })
                    },
                    function (sender, args) {
                        defer.reject(args)
                    }
                );
                return defer.promise
            }
            function getEmailForOneDrive() {
                return _self.appInfo.emailForOneDrive
            }
            function getOneDriveUrl() {
                return _self.onedrive
            }
            function getWopiFrameUrl(file, download) {
                if (file.LinkingUrl) {
                    file.path = file.LinkingUrl
                } else {
                    file.path = getTarget() + file.ServerRelativeUrl
                }
                return file;
            }
            function get(target, apiEndPoint, properties, odata) {

                if (!properties) properties = "";
                else properties = "/" + properties;

                if (!odata) odata = "";
                else odata = "'&" + odata;

                var appweburl = _spPageContextInfo.webAbsoluteUrl
                if (target === "app" || !target) target = appweburl

                var restQueryUrl = appweburl + "/_api/SP.AppContextSite(@target)/" + apiEndPoint + properties + "?@target='" + target + odata + "'"

                var defer = $q.defer();
                var executor = new SP.RequestExecutor(appweburl);
                executor.executeAsync({
                    url: restQueryUrl,
                    method: "GET",
                    headers: { "Accept": "application/json; odata=verbose" },
                    success: function (data, textStatus, xhr) {
                        defer.resolve(JSON.parse(data.body));
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        defer.resolve(JSON.stringify(xhr));
                    }
                });
                return defer.promise;
            }
            function getTarget() {
                return _self.target || _spPageContextInfo.webAbsoluteUrl
            }
            function getAction(type) {
                type = type.toLowerCase() || ""
                switch (type) {
                    case "folder":
                    case "folders":
                        _self.actions.folderAction;
                        break;
                    case "files":
                    case "file":
                        _self.actions.fileAction;
                        break;
                    default:
                        throw new Error("Get Action Require Type, folder or files")
                }
            }
            function loadUser() {
                var defer = $q.defer(), promises = []
                get("app", "web", undefined, "$expand=CurrentUser").then(function (data) {
                    _self.appInfo = data
                    defer.resolve(data)
                }, defer.reject)
                return defer.promise
            }
            function loadOneDrive(action, serverRelativeUrl, properties, overridedOdata) {
                var defer = $q.defer();
                var emailForOneDrive = _self.appInfo.d.CurrentUser.Email.toLowerCase();
                var str = emailForOneDrive;
                emailForOneDrive = emailForOneDrive.replace(/[@\.]/gi, '_');
                _self.appInfo.emailForOneDrive = emailForOneDrive
                var domain = str.substring(str.indexOf('@') + 1, str.indexOf('.'));
                var mysite = 'https://' + domain + '-my.sharepoint.com';
                _self.target = mysite
                var onedrive = mysite + '/personal/' + emailForOneDrive;
                _self.onedrive = onedrive
                //get ready to get documents
                if (!serverRelativeUrl) serverRelativeUrl = '/personal/' + emailForOneDrive + '/Documents'
                var apiAction = action + "('" + serverRelativeUrl + "')";
                var initialOdata = overridedOdata ? overridedOdata : overridedOdata === false ? "" : "$expand=Properties,Files,Folders/Files,Folders/Folders,Folders/Properties,Folders/ParentFolder";
                get(onedrive, apiAction, properties, initialOdata).then(defer.resolve, defer.reject)
                return defer.promise;
            }
            function resource(endPoint) {
                return $resource(
                    _spPageContextInfo.webAbsoluteUrl + "/_api/web/" + endPoint,
                    { odata: '@_odata' },
                    {
                        'update': {
                            method: 'POST',
                            headers: { "IF-MATCH": "*", "content-type": "application/json;odata=verbose", "X-HTTP-Method": "MERGE", "X-RequestDigest": document.querySelector("#__REQUESTDIGEST").value }
                        },
                        'save': {
                            method: 'POST',
                            headers: {
                                "accept": "application/json;odata=verbose",
                                "content-type": "application/json;odata=verbose",
                                "X-RequestDigest": document.getElementById('__REQUESTDIGEST').value
                            }
                        },
                        'query': {
                            method: 'GET',
                            cache: false,
                            isArray: false
                        }
                    }
                );
            }

            return {
                get: get,
                resource: resource,
                getMyFollowedContent: getMyFollowedContent,
                discoveryUsers: discoveryUsers,
                copyTo: copyTo,
                share: share,
                getShareRoles: getShareRoles,
                folowContent: folowContent,
                getAction: getAction,
                getEmailForOneDrive: getEmailForOneDrive,
                getOneDriveUrl: getOneDriveUrl,
                getTarget: getTarget,
                getWopiFrameUrl: getWopiFrameUrl,
                loadUser: loadUser,
                getFileById: getFileById,
                loadOneDrive: loadOneDrive
            }
        })
})(angular);
/*
	polyfills
*/
if (!String.prototype.Format) {
    String.prototype.Format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}
var _headers = function () {
    return {
        'update': {
            method: 'POST',
            headers: {
                "IF-MATCH": "*",
                "content-type": "application/json;odata=verbose",
                "X-HTTP-Method": "MERGE",
                "X-RequestDigest": document.querySelector("#__REQUESTDIGEST").value
            }
        },
        'get': {
            headers: {
                "content-type": "application/json;odata=verbose",
                "accept": "application/json; odata=verbose"
            }
        },
        'remove': {
            method: 'POST',
            headers: {
                "IF-MATCH": "*",
                "content-type": "application/json;odata=verbose",
                'X-HTTP-Method': "DELETE",
				            'X-RequestDigest': document.querySelector("#__REQUESTDIGEST").value
            }
        },
        'save': {
            method: 'POST',
            headers: {
                "accept": "application/json;odata=verbose",
                "content-type": "application/json;odata=verbose",
                'X-HTTP-Method': "",
                "X-RequestDigest": document.querySelector("#__REQUESTDIGEST").value
            }
        },
        'query': {
            isArray: false
        }
    }
}