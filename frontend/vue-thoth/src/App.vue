<template>
  <div>
    <input v-model="query" @input="search" placeholder="Поиск...">
    <table>
      <thead>
        <tr>
          <th>Время</th>
          <th>URL</th>
          <th>Текст страницы</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="result in results" :key="result.id">
          <td>{{ result.timestamp }}</td>
          <td><a :href="result.url" target="_blank">{{ truncateUrl(result.url) }}</a></td>
          <td v-html="highlightAndTruncateText('<strong>' + result.page_name + '</strong><br>' + result.page_text)"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      query: "",
      results: []
    };
  },
  methods: {
    async search() {
      const MEILI_SERVER_URL = "http://nebula.lc:7700";
      const MEILI_AUTH_TOKEN = "Hurt3-Ointment-Gestate";
      const headers = {
        "Authorization": "Bearer " + MEILI_AUTH_TOKEN
      };

      try {
        const response = await axios.post(`${MEILI_SERVER_URL}/indexes/thoth/search`, { q: this.query }, { headers });
        this.results = response.data.hits;
      } catch (error) {
        console.error("An error occurred while searching:", error);
      }
    },
    truncateUrl(url) {
      return url.length > 30 ? url.substring(0, 30) + "..." : url;
    },
    highlightAndTruncateText(text) {
      const index = text.toLowerCase().indexOf(this.query.toLowerCase());
      let start = Math.max(0, index - 2000);
      let end = Math.min(text.length, index + 2000 + this.query.length);

      const truncatedText = text.slice(start, end);
      const regex = new RegExp(this.query, 'gi');
      return truncatedText.replace(regex, match => `<span style="background-color: yellow;">${match}</span>`);
    }

  }
};
</script>

<style>
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
th, td {
  border: 1px solid black;
  padding: 8px;
  text-align: left;
}
</style>
