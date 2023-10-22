<template>
  <div class="container mt-4" style="overflow-x: auto;">
    <b-form-input v-model="query" @input="search" placeholder="Search..." style="font-size: 14px;"></b-form-input>
    <b-table :items="results" :fields="fields" :small="true" class="mt-4 w-100" style="font-size: 12px; min-width: 100%;">
      <template v-slot:cell(page_text)="data">
        <a :href="data.item.url" target="_blank" style="font-size: 14px;">
          <strong>{{ data.item.page_name }} </strong>
          <span>({{ formatDate(data.item.timestamp) }})</span>
        </a>
        <br>
        <div v-html="highlightAndTruncateText(data.item.page_text)"></div>
      </template>
    </b-table>
    <div class="mt-4" style="font-size: 12px;">
      <p>Processing Time: {{ processingTimeMs }} ms, Limit: {{ limit }}, Offset: {{ offset }}, Estimated Total Hits: {{ estimatedTotalHits }}</p>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import moment from "moment";

export default {
  data() {
    return {
      query: "",
      results: [],
      processingTimeMs: 0,
      limit: 0,
      offset: 0,
      estimatedTotalHits: 0,
      fields: ['page_text']
    };
  },
  methods: {
    async search() {
      const MEILI_SERVER_URL = "http://nebula.lc:7700";
      const MEILI_AUTH_TOKEN = "Hurt3-Ointment-Gestate";
      const headers = {
        "Authorization": `Bearer ${MEILI_AUTH_TOKEN}`
      };

      try {
        const response = await axios.post(`${MEILI_SERVER_URL}/indexes/thoth/search`, { q: this.query }, { headers });
        this.results = response.data.hits;
        this.processingTimeMs = response.data.processingTimeMs;
        this.limit = response.data.limit;
        this.offset = response.data.offset;
        this.estimatedTotalHits = response.data.estimatedTotalHits;
      } catch (error) {
        console.error("An error occurred while searching:", error);
      }
    },
    truncateUrl(url) {
      return url.length > 30 ? url.substring(0, 30) + "..." : url;
    },
    highlightAndTruncateText(text) {
      const index = text.toLowerCase().indexOf(this.query.toLowerCase());
      let start = Math.max(0, index - 1000);
      let end = Math.min(text.length, index + 1000 + this.query.length);

      const truncatedText = text.slice(start, end);
      const regex = new RegExp(this.query, 'gi');
      return truncatedText.replace(regex, match => `<span style="background-color: yellow;">${match}</span>`);
    },
    formatDate(timestamp) {
      return moment(timestamp).format("DD/MM/YY");
    }
  }
};
</script>

<style>
.b-table {
  table-layout: fixed;
  word-wrap: break-word;
}
</style>
