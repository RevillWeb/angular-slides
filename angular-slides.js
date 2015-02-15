angular.module('ngSlides', []);

angular.module('ngSlides').provider('slideService', function() {
    this.slides = [];
    this.current = null;
    this.snapPercent = 90;
    this.setSlides = function(slides) {
        this.slides = slides;
        this.current = slides[0];
    };
    this.setSnapPercent = function(percent) {
        this.snapPercent = percent;
    };
    this.$get = ['$rootScope', function($rootScope) {
        var self = this;
        $rootScope.$watch(function(){
            return self.current;
        }, function(){
            $rootScope.$emit('$slideChanged');
        });
        return {
            'getSlides': function() {
                return self.slides;
            },
            'setCurrent': function(index) {
                self.current = self.slides[index];
            },
            'getCurrent': function() {
                return self.current;
            },
            'getSnapPercent': function() {
                return self.snapPercent;
            }
        }
    }];
});

angular.module('ngSlides').directive('slideFrame', ['slideService', '$window', '$timeout', '$rootScope', function(slideService, $window, $timeout, $rootScope){
    return {
        restrict: 'A',
        replace: true,
        template: '<div class="slide-frame"><div class="slide-container"><div class="slide" ng-repeat="slide in slides" id="{{slide.id}}" slide="slide">{{one.title}}</div></div></div>',
        link: function($scope, $element) {
            $scope.slides = slideService.getSlides();
            var $frame = $element;
            var $container = angular.element($element[0].children[0]);
            var $width = 0;
            var $height = 0;
            var $childCount = 0;
            var $currentSlide = 0;
            $scope.set = function(width, height) {
                $width = width;
                $height = height;
                $childCount = $container.children().length;
                $container.css({
                    width: ($childCount * $width) + 'px'
                });
                angular.forEach($container.children(), function(child){
                    angular.element(child).css({
                        width: $width + 'px',
                        height: $height + 'px'
                    });
                });
            };
            $timeout(function(){
                $scope.set($window.outerWidth, $window.outerHeight);
            });
            angular.element($window).bind('resize', function() {
                $scope.set($window.outerWidth, $window.outerHeight);
                $rootScope.$emit('$windowResized');
            });
            var timer = null;
            var previousLeft = 0;
            angular.element($frame).bind('scroll', function() {
                var scrollRight = (previousLeft < $frame[0].scrollLeft);
                previousLeft = $frame[0].scrollLeft;
                if (timer !== null) {
                    $timeout.cancel(timer);
                }
                timer = $timeout(function() {
                    $currentSlide = parseInt(($frame[0].scrollLeft / $width).toString().split('.')[0]);
                    slideService.setCurrent($currentSlide);
                    var inLeft = (($frame[0].scrollLeft / $width) < ($currentSlide + (scrollRight ? ((100 - slideService.getSnapPercent()) / 100) : (slideService.getSnapPercent() / 100))));
                    if (inLeft) {
                        //Snap to left
                        $frame[0].scrollLeft = ($width * $currentSlide);
                    } else {
                        //Snap right
                        $frame[0].scrollLeft = ($width * ($currentSlide + 1));
                    }
                }, 150);
            });
            $rootScope.$on('$goToSlide', function(event, slideId){
                //Find the slide index
                var index = null;
                var cont = true;
                angular.forEach($scope.slides, function(slide, idx){
                    if (cont) {
                        if (slideId == slide.id) {
                            index = idx;
                            cont = false;
                        }
                    }
                });
                //Set the scroll left
                $frame[0].scrollLeft = ($width * index);
            });
        }
    };
}]);

angular.module('ngSlides').directive('slideNav', ['slideService', '$rootScope', '$window', function(slideService, $rootScope, $window){
    return {
        restrict: 'E',
        replace: true,
        template: '<nav class="slide-nav"><ul><li ng-style="{\'width\': (width) + \'px\'}" ng-repeat="slide in slides track by slide.id" ng-class="{\'active\': (current.id == slide.id)}"><a href="#" ng-click="goToSlide(slide.id)">{{slide.title}}</a></li></ul></nav>',
        link: function($scope) {
            $scope.slides = slideService.getSlides();
            $scope.width = Math.floor($window.innerWidth / $scope.slides.length);
            $scope.current = slideService.getCurrent();
            $rootScope.$on('$slideChanged', function(){
                $scope.current = slideService.getCurrent();
            });
            $rootScope.$on('$windowResized', function(){
                $scope.width = Math.floor($window.innerWidth / $scope.slides.length);
                $scope.$apply();
            });
            $scope.goToSlide = function(slideId) {
                $rootScope.$emit('$goToSlide', slideId);
            };
        }
    };
}]);

angular.module('ngSlides').directive('slide', ['$controller', '$log', '$http', '$templateCache', '$compile', '$rootScope', '$q', function($controller, $log, $http, $templateCache, $compile, $rootScope, $q){
    return {
        restrict: 'A',
        scope: {
            'config': '=slide'
        },
        link: function($scope, $element) {
            var html;
            if ($scope.config.template) {
                var deferred = $q.defer();
                deferred.resolve($scope.config.template);
                html = deferred.promise;
            } else {
                html = $http.get($scope.config.templateUrl, {cache: $templateCache}).then(function(response){
                    return response.data;
                });
            }
            html.then(function(html){
                var scope = $rootScope.$new();
                if ($scope.config.controller) {
                    var ctrl = $controller($scope.config.controller, {$scope: scope});
                    if ($scope.config.controllerAs) {
                        scope[$scope.config.controllerAs] = ctrl;
                    }
                }
                var element = angular.element(html);
                $element.prepend(element);
                $compile(element)(scope);
            });
        }
    };
}]);