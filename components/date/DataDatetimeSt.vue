<template>
    <div v-bind:class="cls">

        {{ RetDate(date) }}
    </div>
</template>
<script setup lang="ts">
const prop = defineProps<({
    date: any
    // value: String,
})>()

function RetDate(datestring: any) {
    // console.log(datestring);
    if (datestring == undefined) return ""
    return new Date(datestring).toLocaleTimeString("ja-jp", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", "second": "2-digit" });
}

const cls = computed(() => {
    if (prop.date == null) return ""
    return new Date(prop.date) < new Date(new Date().setDate(new Date().getDate() - 7))
        ? "py-2 !bg-black text-white dark:!bg-white h-full"
        : "py-2"
})

</script>
