<template>
    <div v-bind:class="cls">
        {{ prop.allState
              .replace("Drive", "運転")
              .replace("Break", "停車")
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
// rust-alc-api 移行で AllState が英語コード → 日本語 (運転/停車/休息/運行外/
// 運行終了…) に変わったため、日本語値にマッチさせる。英語コードも fallback で残す。
// 運転=Drive(背景なし), 停車=Break(青), 休息=Rest(紫), 積み=緑, 降し=橙。
const cls = computed(() => {
    const s = prop.allState ?? ""
    const base = s.includes("積み")
        ? "!bg-emerald-500 py-2"
        : s.includes("降し")
            ? "!bg-orange-400 py-2"
            : (s.includes("停車") || s === "Break")
                ? "!bg-sky-400 py-2 text-black"
                : (s.includes("休息") || s === "Rest")
                    ? "!bg-violet-400 py-2 text-black"
                    : (s.includes("運転") || s === "Drive")
                        ? " dark:!text-white py-2"
                        : "py-2"
    return base + " mx-auto text-center "
})



</script>
