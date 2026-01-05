import { createApp } from 'vue';
import './style.css';
import App from './App.vue';

createApp(App).mount('#app');

// env 테스트용 정크코드
if ('development' === import.meta.env.MODE) {
  console.log('MODE:', import.meta.env.MODE);
  console.log('DEV:', import.meta.env.DEV);
  console.log('ENV:', import.meta.env);
  console.log('API:', import.meta.env.VITE_API_BASE_URL);
} else {
  console.log('모드 프로덕트인듯');
}
