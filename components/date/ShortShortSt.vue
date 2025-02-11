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
    // return new Date(datestring).toLocaleDateString("ja-jp", { year: "2-digit", month: "2-digit", day: "2-digit" });
    return new Date(datestring).toLocaleDateString("ja-jp", { month: "2-digit", day: "2-digit" });
}


</script>
