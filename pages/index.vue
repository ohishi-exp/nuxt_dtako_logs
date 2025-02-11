<template>
  <div>

    <div ref="gmap" class="h-[500px] w-[800px] hidden" ></div>
    <UButton label="Open" @click="isOpen = true" />

    <UInput placeholder="Search..." v-model="q"></UInput>
    <UTable v-model="selected" @select="select" :rows="filteredRows" :ui="{
      base: ' border-separate border-spacing-0',
      wrapper: 'max-full h-screen border border-white lg:w-max mx-auto',
      th: {
        base:
          'text-center rtl:text-right border-white border border-separate sticky top-0 dark:bg-black',
      },
    }" :columns="columns">
      <template #VehicleName-data="{ row }">

      </template>
      <template #DataDateTime-data="{ row }">
        <DateShortDatetimeSt :date="row.DataDateTime.value" />
      </template>

      <template #AllState-data="{ row }">
        <div class="mx-auto text-center">
          {{
            row.AllState.value
              .replace("Drive", "運転")
              .replace("Break", "休憩")
              .replace("Rest", "休息")
              .replace("End", "終了")
          }}
        </div>
      </template>
      <template #Button-data="{ row }">
        <!-- <UButton @click="isOpen = true" label="Open"> -->
        <!-- {{ isExpanded ? 'collapse' : 'expand' }} -->
        <!-- </UButton> -->
      </template>
    </UTable>
  </div>


</template>


<style lang="css" scoped>
.gm-style-iw-chr {display: none!important;}

</style>
<script setup lang="ts">

console.log("public")
// console.log("config:",config)
// console.log("config:",config.public.googlemapKey)



import type { components } from '#nuxt-api-party/jsonPlaceholder'
import { convertToObject } from 'typescript'


const selected = ref<components["schemas"]["dtakologsSchema"][]>([])
// watch(selected.value,(v1)=>{
//   console.log(v1)
// })
const isOpen = ref(false)

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

const slideover = useSlideover()

const gmap = ref<HTMLElement>()

function select(row: components["schemas"]["dtakologsSchema"]) {

  const index = selected.value.findIndex(item => item.VehicleName === row.VehicleName && item.DataDateTime == row.DataDateTime)

  const index2 = data.value?.findIndex(item => {
    console.log(item)
    console.log(row)
    console.log(item.DataDateTime.value == row.DataDateTime.value)
    console.log("item.DataDateTime:", item.DataDateTime.value)
    console.log("row.DataDateTime:", row.DataDateTime.value)
    return item.VehicleName === row.VehicleName && item.DataDateTime.value == row.DataDateTime.value
    // item.GPSLatitude
  })
  gmap.value?.classList.remove("hidden")


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
    const mm = new google.maps.Map(
      gmap.value,
      {

        center: new google.maps.LatLng(latitude, longitude),
        zoom: 17,
        mapId: "DEMO_MAP_ID", // Map ID is required for advanced markers.
      }
    )
    const parser = new DOMParser();
    console.log("row:", row)
    // const pinSvgString='<svg version="1.1" id="icons" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 128 128" fill="none"><g id="row1"><path id="nav:2_3_" d="M64 1 17.9 127 64 99.8l46.1 27.2L64 1zm0 20.4 32.6 89.2L64 91.3V21.4z" style="fill:#191919"/></g></svg>'
    // const pinSvgString = '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="28" fill="#7837FF"></rect><path d="M46.0675 22.1319L44.0601 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.9402 33.2201L9.93262 33.8723" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 47.0046V44.8933" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 9V11.1113" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 43.3597L37.9186 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 12.6442L18.0816 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.93262 22.1319L11.9402 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M46.0676 33.8724L44.0601 33.2201" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 12.6442L37.9186 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 43.3597L18.0816 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M28 39L26.8725 37.9904C24.9292 36.226 23.325 34.7026 22.06 33.4202C20.795 32.1378 19.7867 30.9918 19.035 29.9823C18.2833 28.9727 17.7562 28.0587 17.4537 27.2401C17.1512 26.4216 17 25.5939 17 24.7572C17 23.1201 17.5546 21.7513 18.6638 20.6508C19.7729 19.5502 21.1433 19 22.775 19C23.82 19 24.7871 19.2456 25.6762 19.7367C26.5654 20.2278 27.34 20.9372 28 21.8649C28.77 20.8827 29.5858 20.1596 30.4475 19.6958C31.3092 19.2319 32.235 19 33.225 19C34.8567 19 36.2271 19.5502 37.3362 20.6508C38.4454 21.7513 39 23.1201 39 24.7572C39 25.5939 38.8488 26.4216 38.5463 27.2401C38.2438 28.0587 37.7167 28.9727 36.965 29.9823C36.2133 30.9918 35.205 32.1378 33.94 33.4202C32.675 34.7026 31.0708 36.226 29.1275 37.9904L28 39Z" fill="#FF7878"></path></svg>';
    // const pinSvgString = '<svg version="1.1" id="icons" xmlns="http://www.w3.org/2000/svg" x="0" y="0" viewBox="0 0 128 128"><style>.st0,.st1{display:none;fill:#191919}.st1,.st3{fill-rule:evenodd;clip-rule:evenodd}.st3,.st4{display:inline;fill:#191919}</style><g id="row1"><path id="nav:2_3_" d="M64 1 17.9 127 64 99.8l46.1 27.2L64 1zm0 20.4 32.6 89.2L64 91.3V21.4z" style="fill:#191919"/></g></svg>'
    // const pinSvgString='<svg width="24"   height="24"  viewBox="0 0 24 24"  fill="none"  xmlns="http://www.w3.org/2000/svg">  <path    d="M11.0001 3.67157L13.0001 3.67157L13.0001 16.4999L16.2426 13.2574L17.6568 14.6716L12 20.3284L6.34314 14.6716L7.75735 13.2574L11.0001 16.5001L11.0001 3.67157Z"    fill="currentColor"  /></svg>'
    const pinSvgString = '<svg  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  xmlns="http://www.w3.org/2000/svg" transform="rotate(' + row.GPSDirection + ')">  <path    d="M14.8285 11.9481L16.2427 10.5339L12 6.29122L7.7574 10.5339L9.17161 11.9481L11 10.1196V17.6568H13V10.1196L14.8285 11.9481Z"    fill="currentColor"  /> <path    fill-rule="evenodd"    clip-rule="evenodd"    d="M19.7782 4.22183C15.4824 -0.0739415 8.51759 -0.0739422 4.22183 4.22183C-0.0739415 8.51759 -0.0739422 15.4824 4.22183 19.7782C8.51759 24.0739 15.4824 24.0739 19.7782 19.7782C24.0739 15.4824 24.0739 8.51759 19.7782 4.22183ZM18.364 5.63604C14.8492 2.12132 9.15076 2.12132 5.63604 5.63604C2.12132 9.15076 2.12132 14.8492 5.63604 18.364C9.15076 21.8787 14.8492 21.8787 18.364 18.364C21.8787 14.8492 21.8787 9.15076 18.364 5.63604Z"    fill="currentColor"  /></svg>'
    var arrow_icon = {
      path: 'M -1.1500216e-4,0 C 0.281648,0 0.547084,-0.13447 0.718801,-0.36481 l 17.093151,-22.89064 c 0.125766,-0.16746 0.188044,-0.36854 0.188044,-0.56899 0,-0.19797 -0.06107,-0.39532 -0.182601,-0.56215 -0.245484,-0.33555 -0.678404,-0.46068 -1.057513,-0.30629 l -11.318243,4.60303 0,-26.97635 C 5.441639,-47.58228 5.035926,-48 4.534681,-48 l -9.06959,0 c -0.501246,0 -0.906959,0.41772 -0.906959,0.9338 l 0,26.97635 -11.317637,-4.60303 c -0.379109,-0.15439 -0.812031,-0.0286 -1.057515,0.30629 -0.245483,0.33492 -0.244275,0.79809 0.0055,1.13114 L -0.718973,-0.36481 C -0.547255,-0.13509 -0.281818,0 -5.7002158e-5,0 Z',
      strokeColor: 'black',
      strokeOpacity: 1,
      strokeWeight: 1,
      fillColor: '#fefe99',
      fillOpacity: 1,
      rotation: 36,
      scale: 1.0
    };

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
      
      content: pinSvg,
      title:"test"
      // content: arrow_icon,

      // icon

    })
    const info =new InfoWindow({content:"st"})
    
    info.open(mm,marker)
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

const { $loader } = useNuxtApp()
const { Map,InfoWindow } = await $loader.importLibrary("maps")
const { AdvancedMarkerElement, PinElement } = await $loader.importLibrary("marker")

const mapOptions = {
  center: {
    lat: 34.60,
    lng: 135.52
  },
  zoom: 15
};

onMounted(async () => {

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

      VehicleName: dd.VehicleName,
      DriverName: dd.DriverName,
      AddressDispC: dd.AddressDispC,
      DataDateTime: {
        value: dd.DataDateTime,
        class:
          dd.DataDateTime == null
            ? ""
            : new Date(dd.DataDateTime) <
              new Date(new Date().setDate(new Date().getDate() - 7))
              ? "!bg-black text-white dark:!bg-white"
              : "",
      },
      AddressDispP: dd.AddressDispP,
      SubDriverCD: dd.SubDriverCD,
      AllState: {
        value: dd.AllState == null ? "" : dd.AllState,
        class:
          dd.AllState == "Drive"
            ? " dark:!text-white"
            : dd.AllState?.includes("積み")
              ? "!text-emerald-500"
              : dd.AllState?.includes("降し")
                ? "!text-orange-400"
                : dd.AllState == "Break"
                  ? "!text-sky-400"
                  : dd.AllState == "Rest"
                    ? "!text-violet-400"
                    : "",
      },
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
