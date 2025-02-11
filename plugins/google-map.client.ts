import * as pkg from '@googlemaps/js-api-loader';
const { Loader } = pkg;

export default defineNuxtPlugin((nuxtApp) => {
    const config =useRuntimeConfig()
    return {
        provide: {
            loader: new pkg.Loader({
                apiKey: config.public.googlemapKey,
                version: "weekly",
                libraries: ["places"]
            })
        }
    }
});