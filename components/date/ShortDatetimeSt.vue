<template>
    {{ RetDate(date) }}
</template>
<script setup lang="ts">
defineProps<({
    date: any
    // value: String,
})>()

function RetDate(datestring: any) {
    // console.log(datestring);
    if (datestring == undefined) return ""
    return new Date(datestring).toLocaleTimeString("ja-jp", { year: "2-digit", month: "2-digit", day: "2-digit" ,hour:"2-digit",minute:"2-digit","second":"2-digit"});
}


</script>
