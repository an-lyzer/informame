

<script setup>
</script>

<template>
	<div class="grid-container">
		<slot />
	</div>
</template>


<style scoped>
.grid-container {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 1rem;
}

@media (max-width: 1024px) {
	.grid-container {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 600px) {
	.grid-container {
		grid-template-columns: 1fr;
	}
}
</style>