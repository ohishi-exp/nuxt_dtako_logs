<template>
  <div class="grid-rows-3">

    <div class="flex place-content-end">

      <UButton label="Open" @click="isOpen = true" />
      <UButton :icon="isDark ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'" color="gray" variant="ghost"
      aria-label="Theme" @click="isDark = !isDark" />
    </div>
      <div class="flex  place-content-end">

        <UInput placeholder="Search..." v-model="q"></UInput>
        <input type="date" v-model="DateD" class="disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border"/>
      </div>
    <div class="grid-rows-1 flex hidden" ref="hiddenEl">
      <div ref="gmap" class="h-[500px] w-[800px] hidden"></div>

      <UTable :rows="data2" :columns="columns" @select="select2" :ui="{
        base: ' border-separate border-spacing-0',
        wrapper: 'max-full h-[50vh] border border-white',
        tr: {
          active: 'hover:bg-gray-200 dark:hover:bg-gray-100/50 cursor-pointer'
        },
        th: {
          base:
            'text-center rtl:text-right border-black bg-white border-l border-l-black last:border-r last:border-r-black border-y border-separate sticky top-0 dark:bg-black z-30',
        },
        td: {

          base: 'border-l border-l-black last:border-r last:border-r-black',
          padding: 'px-1 py-0'
        }
      }">
        <template #DataDateTime-data="{ row }">
          <DateDataDatetimeSt :date="row.DataDateTime" />
        </template>

        <template #AllState-data="{ row }">
          <AllState :all-state="row.AllState" />
        </template>
      </UTable>
    </div>
    <UTable v-model="selected" @select="select" :rows="filteredRows" :ui="{
      base: ' border-separate border-spacing-0',
      wrapper: 'max-full h-screen border border-white lg:w-max mx-auto',
      tr: {
        active: 'hover:bg-gray-200 dark:hover:bg-gray-100/50 cursor-pointer'
      },
      th: {
        base:
          'text-center rtl:text-right border-black bg-white border-l border-l-black last:border-r last:border-r-black border-y border-separate sticky top-0 dark:bg-black z-30',
      },
      td: {

        base: 'border-l border-l-black last:border-r last:border-r-black',
        padding: 'px-1 py-0'
      }
    }" :columns="columns">
      <template #VehicleName-data="{ row }">

      </template>
      <template #DataDateTime-data="{ row }">
        <DateDataDatetimeSt :date="row.DataDateTime" />
      </template>

      <template #AllState-data="{ row }">
        <AllState :all-state="row.AllState" />
      </template>
      <template #Button-data="{ row }">
      </template>
    </UTable>
  </div>


</template>


<script setup lang="ts">

const DateD = ref("")

console.log("public")
import { UInput } from '#components'
import type { components } from '#nuxt-api-party/jsonPlaceholder'
import AllState from '~/components/allState.vue'


const selected = ref<components["schemas"]["dtakologsSchema"][]>([])
// watch(selected.value,(v1)=>{
//   console.log(v1)
// })
const isOpen = ref(false)

const hiddenEl = ref<HTMLElement>()

function ConvertLatLngDDMMtoDD(SetlatNm: Number, SetLngNm: Number) {

  const SetlatSt = (SetlatNm.toString() + "00000000").substring(0, 8);
  const SetLngSt = (SetLngNm.toString() + "000000000").substring(0, 9);

  const Setlat = Number(SetlatSt)
  const SetLng = Number(SetLngSt)

  var s1 = ((Setlat % 10000) * 60) / 10000;
  var s2 = ((SetLng % 10000) * 60) / 10000;

  var m1 = (Math.floor(Setlat / 10000)) % 100;
  var m2 = (Math.floor(SetLng / 10000)) % 100;

  var lati = Math.floor(Setlat / 1000000) + (m1 / 60) + (s1 / 3600);
  var lng = Math.floor(SetLng / 1000000) + (m2 / 60) + (s2 / 3600);

  return { latitude: lati, longitude: lng };
}

const { $loader } = useNuxtApp()
const { Map, InfoWindow } = await $loader.importLibrary("maps")
const { AdvancedMarkerElement, PinElement } = await $loader.importLibrary("marker")

const data2 = ref<components["schemas"]["dtakologsSchemaArray"]>([])


const colorMode = useColorMode()
const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  }
})
const slideover = useSlideover()

const gmap = ref<HTMLElement>()

// const mm = ref<google.maps.Map>()



// watch(() => gmap.value, (v) => {
//   if (gmap.value != undefined) {

//     mm.value = new Map(
//       // const mm = new google.maps.Map(
//       gmap.value,
//       {

//         center: new google.maps.LatLng(35, 135),
//         zoom: 17,
//         mapId: "DEMO_MAP_ID", // Map ID is required for advanced markers.
//       }
//     )
//   }
// })


async function select2(row: components["schemas"]["dtakologsSchema"]) {

  const index2 = data2.value?.findIndex(item => {
    console.log(item)
    console.log(row)
    console.log(item.DataDateTime == row.DataDateTime)
    console.log("item.DataDateTime:", item.DataDateTime)
    console.log("row.DataDateTime:", row.DataDateTime)
    return item.VehicleName === row.VehicleName && item.DataDateTime == row.DataDateTime
    // item.GPSLatitude
  })

  if (gmap.value != undefined && index2 != -1 && index2 != undefined) {
    console.log("row.GPSLatitude/100000:", row.GPSLatitude / 1000000)

    const { latitude, longitude } = ConvertLatLngDDMMtoDD(row.GPSLatitude, row.GPSLongitude)
    // mm.value = new Map(
    //   gmap.value,
    //   {

    //     center: new google.maps.LatLng(latitude, longitude),
    //     zoom: 17,
    //     mapId: "DEMO_MAP_ID", // Map ID is required for advanced markers.
    //   }
    // )
    mm.setCenter(new google.maps.LatLng(latitude, longitude))

    const parser = new DOMParser();
    console.log("row:", row)
    var color = row.AllState == "Drive"
      ? "fill-none"
      : row.AllState?.includes("積み")
        ? "fill-emerald-500"
        : row.AllState?.includes("降し")
          ? "fill-orange-400"
          : row.AllState == "Break"
            ? "fill-sky-400"
            : row.AllState == "Rest"
              ? "fill-violet-400"
              : "fill-none"
    const pinSvgString = '<svg  width="24"  height="24"  viewBox="0 0 24 24"  fill="red"  xmlns="http://www.w3.org/2000/svg" transform="rotate(' + row.GPSDirection + ')" color="black">   <circle cx="50%" cy="50%" r="10" class="' + color + '" /> <path    d="M14.8285 11.9481L16.2427 10.5339L12 6.29122L7.7574 10.5339L9.17161 11.9481L11 10.1196V17.6568H13V10.1196L14.8285 11.9481Z"    fill="black"  /> <path    fill-rule="evenodd"    clip-rule="evenodd"    d="M19.7782 4.22183C15.4824 -0.0739415 8.51759 -0.0739422 4.22183 4.22183C-0.0739415 8.51759 -0.0739422 15.4824 4.22183 19.7782C8.51759 24.0739 15.4824 24.0739 19.7782 19.7782C24.0739 15.4824 24.0739 8.51759 19.7782 4.22183ZM18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604C2.12132 9.15076 2.12132 14.8492 5.63604 18.364C9.15076 21.8787 14.8492 21.8787 18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604Z"    fill="currentColor"  /></svg>'

    const pinSvg =
      parser.parseFromString(pinSvgString, 'image/svg+xml').documentElement;

    console.log("row:", row)
    const img = document.createElement('img');
    img.src = "/arrow.png"

    const marker = new AdvancedMarkerElement({
      map: mm,
      position: new google.maps.LatLng(latitude, longitude),
      // title: "test",
      // content: img,


      gmpDraggable: true,
      content: pinSvg,
      title: "test",
      // zIndex: 200,
      // content: arrow_icon,

      gmpClickable: true
      // icon

    })

    var sst = "<p style='color:black'>"
    columns.forEach((v) => {

      if (v.key) {
        switch (v.key) {
          case "DataDateTime":
            sst += v.label + ":" + new Date(row[v.key]).toLocaleTimeString("ja-jp", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", "second": "2-digit" }) + "<br>"
            break
          default:
            sst += v.label + ":" + row[v.key] + "<br>"
        }
      }
    })
    sst += "</p>"

    const info = new InfoWindow({ content: sst })
    marker.addListener("click", () => {
      console.log("click")
      // const {target}=ev
      info.close()
      info.setContent(sst)
      info.open({ anchor: marker, map: mm })

    })

    info.open(mm, marker)


  }
}

const marker = ref<google.maps.marker.AdvancedMarkerElement>()
var mm: google.maps.Map;

async function select(row: components["schemas"]["dtakologsSchema"]) {


  // console.log("dated:", DateD.value)
  // console.log("row:", row)
  const index = selected.value.findIndex(item => item.VehicleName === row.VehicleName && item.DataDateTime == row.DataDateTime)

  const index2 = data.value?.findIndex(item => {
    console.log(item)
    console.log(row)
    console.log(item.DataDateTime == row.DataDateTime)
    console.log("item.DataDateTime:", item.DataDateTime)
    console.log("row.DataDateTime:", row.DataDateTime)
    return item.VehicleName === row.VehicleName && item.DataDateTime == row.DataDateTime
    // item.GPSLatitude
  })
  gmap.value?.classList.remove("hidden")
  hiddenEl.value?.classList.remove("hidden")


  console.log("filteredRows.value:", filteredRows.value)
  console.log("index2:", index2)
  if (index === -1) {
    selected.value.push(row)
  } else {
    selected.value.splice(index, 1)
  }
  isOpen.value = selected.value.length ? true : false


  console.log("gmap.value:", gmap.value)
  if (gmap.value != undefined && index2 != -1 && index2 != undefined) {
    console.log("row.GPSLatitude/100000:", row.GPSLatitude / 1000000)

    const { latitude, longitude } = ConvertLatLngDDMMtoDD(row.GPSLatitude, row.GPSLongitude)

    mm.setCenter(new google.maps.LatLng(latitude, longitude))
    const parser = new DOMParser();
    console.log("row:", row)
    var color = row.AllState == "Drive"
      ? "fill-none"
      : row.AllState?.includes("積み")
        ? "fill-emerald-500"
        : row.AllState?.includes("降し")
          ? "fill-orange-400"
          : row.AllState == "Break"
            ? "fill-sky-400"
            : row.AllState == "Rest"
              ? "fill-violet-400"
              : "fill-none"
    const pinSvgString = '<svg  width="24"  height="24"  viewBox="0 0 24 24"  fill="red"  xmlns="http://www.w3.org/2000/svg" transform="rotate(' + row.GPSDirection + ')" color="black">   <circle cx="50%" cy="50%" r="10" class="' + color + '" /> <path    d="M14.8285 11.9481L16.2427 10.5339L12 6.29122L7.7574 10.5339L9.17161 11.9481L11 10.1196V17.6568H13V10.1196L14.8285 11.9481Z"    fill="black"  /> <path    fill-rule="evenodd"    clip-rule="evenodd"    d="M19.7782 4.22183C15.4824 -0.0739415 8.51759 -0.0739422 4.22183 4.22183C-0.0739415 8.51759 -0.0739422 15.4824 4.22183 19.7782C8.51759 24.0739 15.4824 24.0739 19.7782 19.7782C24.0739 15.4824 24.0739 8.51759 19.7782 4.22183ZM18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604C2.12132 9.15076 2.12132 14.8492 5.63604 18.364C9.15076 21.8787 14.8492 21.8787 18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604Z"    fill="currentColor"  /></svg>'
    console.log("color:", color)
    const pinSvg =
      parser.parseFromString(pinSvgString, 'image/svg+xml').documentElement;

    console.log("row:", row)
    const img = document.createElement('img');
    img.src = "/arrow.png"

    const beachFlagImg = document.createElement('img');
    beachFlagImg.src = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';


    // console.log(mm.value)
    const marker = new AdvancedMarkerElement({
      // map: mm.value,
      map: mm,
      position: new google.maps.LatLng(latitude, longitude),
      // title: "test",
      // content: img,

      content: pinSvg,
      title: "test",
      // zIndex: 400
      // content: arrow_icon,
      // content: beachFlagImg,

      // icon

    })

    console.log("marker.value:", marker)

    console.log("row.VehicleCD:", row.VehicleCD)

    var EntDate = null
    if (DateD.value) {
      var dt = new Date(new Date(DateD.value).setHours(new Date(DateD.value).getHours() + 6))
      // dt = new Date(dt.setHours(dt.getHours() - 9))
      // console.log("dt:",dt)
      EntDate = dt.toLocaleDateString() + " " + dt.toLocaleTimeString()
    }


    console.log("EntDate:", EntDate)
    data2.value = await $jsonPlaceholder("/api/dtakologs/view", {
      method: "POST",
      body: {
        VehicleCD: row.VehicleCD,
        DataDateTime: EntDate
      },

    })


    console.log("data2.value:", data2.value)


    var sst = "<p style='color:black'>"
    columns.forEach((v) => {

      if (v.key) {
        switch (v.key) {
          case "DataDateTime":
            sst += v.label + ":" + new Date(row[v.key]).toLocaleTimeString("ja-jp", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", "second": "2-digit" }) + "<br>"
            break
          default:
            sst += v.label + ":" + row[v.key] + "<br>"
        }
      }
    })
    sst += "</p>"

    const info = new InfoWindow({ content: sst })

    info.open(mm, marker)

    marker.addListener("click", () => {
      console.log("click")
      // const {target}=ev
      info.close()
      info.setContent(sst)
      info.open({ anchor: marker, map: mm })

    })
    // info.open(mm, marker)
    console.log(marker)
  }

  console.log("index,row:", index, row)
}

// th: { base: 'sticky top-0' },
// wrapper: 'border-separate',
// <!-- :ui="{
// }" -->
// import { schemas } from "../../../test";
// import { z } from "zod";

// type dtakologsSchema = z.infer<typeof schemas.dtakologsSchema>;
const columns = [
  { key: "VehicleName", label: "車番" },
  { key: "DriverName", label: "氏名" },
  { key: "DataDateTime", label: "日時" },
  { key: "AllState", label: "状況" },
  { key: "State2", label: "道路" },
  { key: "AddressDispC", label: "位置" },
  { key: "AddressDispP", label: "場所" },
  { key: "SubDriverCD", label: "助手CD" },
  // { key: "AllStateRyoutColor", label: "状況" },
  // { key: "AllStateEx", label: "AllStateEx" },
  // { key: "AllStateFontColor", label: "AllStateFontColor" },
  // { key: "ReciveTypeColorName", label: "ReciveTypeColorName" },
  { key: "Speed", label: "速度" },
  { key: "Button", label: "place" },
];

const q = ref("");


const mapOptions = {
  center: {
    lat: 34.60,
    lng: 135.52
  },
  zoom: 15
};


onMounted(async () => {
  if (gmap.value != undefined) {

    mm = new Map(
      // const mm = new google.maps.Map(
      gmap.value,
      {

        center: new google.maps.LatLng(35, 135),
        zoom: 17,
        mapId: "DEMO_MAP_ID", // Map ID is required for advanced markers.
      }
    )
  }
  // const req = useRequestEvent();
  // console.log("req:", req);
  // const dd1 = await $fetch("/api/user");
  // console.log("dd1:", dd1)


  // const loader = new Loader({
  //   apiKey: config.public.googlemapKey,
  //   version: "weekly",
  //   libraries: ["places","marker"]
  // });



});


const { data, status, error, refresh, clear } = useJsonPlaceholderData("/api/dtakologs/currentListAll", {
  // client:true,

  transform: (data) => {
    return data.map((dd) => ({
      GPSDirection: dd.GPSDirection,
      GPSLatitude: dd.GPSLatitude,
      GPSLongitude: dd.GPSLongitude,

      VehicleCD: dd.VehicleCD,
      VehicleName: dd.VehicleName,
      DriverName: dd.DriverName,
      AddressDispC: dd.AddressDispC,
      DataDateTime: dd.DataDateTime,
      AddressDispP: dd.AddressDispP,
      SubDriverCD: dd.SubDriverCD,
      AllState: dd.AllState == null ? "" : dd.AllState,
      ReciveTypeColorName: dd.ReciveTypeColorName,
      AllStateEx: dd.AllStateEx,
      State2:
        dd.AllState != null
          ? ["Drive", "Rest", "Break"].includes(dd.AllState)
            ? dd.State2
            : ""
          : "",
      AllStateFontColor: dd.AllStateFontColor,
      Speed: dd.Speed == 0 ? "" : dd.Speed,
    }));
  },
});

const filteredRows = computed(() => {
  if (!q.value) {
    console.log("dd");
    return data.value != null ? data.value : undefined;
  }
  console.log("else");
  if (data.value) {

    const filter = data.value.filter((dd) => {
      return Object.values(dd).some((value) => {
        // console.log(value)
        // console.log("q", q.value);
        const st = q.value.replace("\n", "").replace("\r\n", "");
        return String(value).includes(st);
      });
    });
    return filter != null ? filter : undefined
  } else {
    return undefined
    data.value
  }
});
</script>
