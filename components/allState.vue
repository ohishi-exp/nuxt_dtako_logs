<template>
    <div v-bind:class="cls">
        {{ prop.allState
              .replace("Drive", "運転")
              .replace("Break", "休憩")
              .replace("Rest", "休息")
              .replace("End", "終了") }}
    </div>

</template>
<script setup lang="ts">
const prop = withDefaults(defineProps<{
    allState: string,
}>(), {
    allState: "",
})
const cls = computed(() => {
    const base = prop.allState == "Drive"
        ? " dark:!text-white py-2"
        : prop.allState?.includes("積み")
            ? "!bg-emerald-500 py-2"
            : prop.allState?.includes("降し")
                ? "!bg-orange-400 py-2"
                : prop.allState == "Break"
                    ? "!bg-sky-400 py-2 text-black"
                    : prop.allState == "Rest"
                        ? "!bg-violet-400 py-2 text-black"
                        : "py-2"
    return base + " mx-auto text-center "
})



</script>