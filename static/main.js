const OSMMap = {
    template: `<div ref="map" class="main-map"></div>`,
    data() {
        return {
            articles: [],
            map: null,
            markers: null,
        }
    },
    mounted() {
        let centerPosition = ol.proj.fromLonLat([15.6199149, 58.415036])

        // Reuse
        this.markers = new ol.source.Vector({
            features: [],
        })

        this.map = new ol.Map({
            target: this.$refs["map"],
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                }),
                new ol.layer.Vector({
                    source: this.markers,
                    style: new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 46],
                            anchorXUnits: "fraction",
                            anchorYUnits: "pixels",
                            src:
                                "https://openlayers.org/en/latest/examples/data/icon.png",
                        }),
                    }),
                }),
            ],
            view: new ol.View({
                center: centerPosition,
                zoom: 12,
            }),
        })

        this.map.on("click", (event) => {
            var feature = this.map.forEachFeatureAtPixel(
                event.pixel,
                (feature) => {
                    return feature
                }
            )

            this.$router.push({
                path: `/item/${feature.values_.articleSlug}/${feature.values_.itemIndex}`,
            })
        })
    },
    watch: {
        articles: function (articles) {
            this.drawMarkers()
        },
        $route: function () {
            this.drawMarkers()
        },
    },
    methods: {
        drawMarkers() {
            // Add stuff on map based on route
            article = this.articles.find(
                (a) => a.slug === this.$route.params.article
            )

            // TODO: Add 404 if article is not found

            // Update map
            this.markers.clear()

            let itemIndex = 0
            for (let item of article.items) {
                const iconFeature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([
                            item.coordinate.lng,
                            item.coordinate.lat,
                        ])
                    ),
                    articleSlug: article.slug,
                    itemIndex: itemIndex,
                })

                this.markers.addFeature(iconFeature)
                itemIndex += 1
            }
            this.map.getView().fit(this.markers.getExtent(), {
                padding: [20, 20, 20, 20],
            }) // TODO: Add padding
        },
    },
    created() {
        fetch("articles.json")
            .then((response) => response.json())
            .then((json) => {
                this.articles = json.articles
            })
    },
}

const Navigation = Vue.component("navigation", {
    template: "#navigation-template",
    data() {
        return {
            navigation: [],
            navigationTagActive: null,
        }
    },
    created() {
        Promise.all([fetch("tags.json"), fetch("articles.json")])
            .then(([tags, articles]) =>
                Promise.all([tags.json(), articles.json()])
            )
            .then(([tags, articles]) => {
                this.navigation = tags.tags.map((tag) => {
                    return {
                        name: tag.name,
                        slug: tag.slug,
                        articles: articles.articles.filter((article) => {
                            return (
                                article.tags.findIndex(
                                    (t) => t.slug === tag.slug
                                ) !== -1
                            )
                        }),
                    }
                })
            })
    },
})

const Item = {
    template: "#item-template",
    data: function () {
        return {
            articles: [],
        }
    },
    created() {
        fetch("articles.json")
            .then((reponse) => reponse.json())
            .then((json) => {
                this.articles = json.articles
            })
    },
    computed: {
        activeArticle: function () {
            return this.articles.find(
                (a) => a.slug === this.$route.params.article
            )
        },
        activeItem: function () {
            if (this.activeArticle === undefined) {
                return null
            }
            return this.activeArticle.items[this.$route.params.itemIndex]
        },
    },
}

const Landing = {
    template: `<div><h1>Välkommen till Nature GPS</h1><p>Här finns massor med punkter 
               med olika saker, börja med att trycka på menyn här ovan.</p></div>`,
}

const router = new VueRouter({
    routes: [
        { path: "/", component: Landing },
        {
            path: "/map/:article",
            component: OSMMap,
        },
        { path: "/nav/:tag?", component: Navigation },
        { path: "/item/:article/:itemIndex", component: Item },
    ],
})

const app = new Vue({
    router,
    data: {
        navigationActive: false,
    },
    methods: {
        toggleNavigation() {
            this.navigationActive = !this.navigationActive
        },
    },
}).$mount("#app")

router.beforeEach((to, from, next) => {
    app.navigationActive = false
    next()
})
