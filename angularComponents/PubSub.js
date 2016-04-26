(function (angular) {
    angular.module('PubSub', []).service('PubSubService', function () {
        return { Initialize: Initialize };
        function Initialize(scope) {
            //Keep a dictionary to store the events and its subscriptions
            var publishEventMap = {};
            //Register publish events
            scope.publish = scope.publish || function () {
                var _thisScope = this,
                    handlers,
                    args,
                    evnt;
                //Get event and rest of the data
                args = [].slice.call(arguments);
                evnt = args.splice(0, 1);
                //Loop though each handlerMap and invoke the handler
                angular.forEach((publishEventMap[evnt] || []), function (handlerMap) {
                    handlerMap.handler.apply(_thisScope, args);
                })
            }
            //Register Subscribe events
            scope.subscribe = scope.subscribe || function (evnt, handler) {
                var _thisScope = this,
                    handlers = (publishEventMap[evnt] = publishEventMap[evnt] || []);

                //Just keep the scopeid for reference later for cleanup
                handlers.push({ $id: _thisScope.$id, handler: handler });
                //When scope is destroy remove the handlers that it has subscribed.  
                _thisScope.$on('$destroy', function () {
                    for (var i = 0, l = handlers.length; i < l; i++) {
                        if (handlers[i].$id === _thisScope.$id) {
                            handlers.splice(i, 1);
                            break;
                        }
                    }
                });
            }

        }
    }).run(function ($rootScope, PubSubService) {
        PubSubService.Initialize($rootScope);
    })
})(angular)