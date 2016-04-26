; (function (angular) {
    angular.module('Components', ['SharePoint'])
        .directive('searchComponent', function (RestGetItems, $q) {
            return {
                restrict: 'AE',
                scope: {
                    title: "@",
                    tpl: "@",
                    odata: "@",
                    liststosearch: "@"
                },
                link: function (scope, element, attrs) {
                    scope.lists = eval(scope.liststosearch);
                    RestGetItems(scope.title, scope.odata).then(function (response) {
                        scope.dataToFilter = response.data.d.results;
                    })
                    function getOdata(keyword, columns) {
                        var y = columns.length
                        var odata = ['$filter=']
                        while (y--) {
                            var column = columns[y];
                            var obj = {}
                            var isLookUp = false;
                            if (column.indexOf('Id') > -1) {
                                isLookUp = true;
                                column = column.split('Id')[0];
                                obj = scope.dataToFilter.reduce(function (retorno, currrent) {
                                    if (currrent.Title === keyword) {
                                        retorno = currrent;
                                    }
                                    return retorno;
                                }, {})
                            }
                            odata.push("(")
                            odata.push(column)
                            odata.push(" eq ")
                            if (!obj.ID && !isLookUp) {
                                odata.push("'")
                                odata.push(keyword)
                                odata.push("'")
                            } else {
                                odata.push(obj.ID || 0)
                            }
                            odata.push(")")
                            if (y !== 0) {
                                odata.push(" or ");
                            }
                        }
                        return odata.join("");
                    }
                    scope.search = function (keyword) {
                        scope.results = [];
                        var promises = []
                        var x = scope.lists.length;
                        while (x--) {
                            var list = scope.lists[x];
                            var odata = getOdata(keyword, list.columns)
                            promises.push(RestGetItems(list.Title, odata));
                        }
                        $q.all(promises).then(function (results) {
                            scope.results = results.reduce(function (retorno, current) {
                                return retorno.concat(current.data.d.results)
                            }, [])
                        })

                    }
                },
                templateUrl: function (element, attr) {
                    return attr.tpl
                }
            }
        })
})(angular);