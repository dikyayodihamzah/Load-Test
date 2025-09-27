// example-options.js

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Gunakan stages untuk menaikkan/menurunkan jumlah VU secara bertahap.
  // Catatan: Saat 'stages' digunakan, konfigurasi 'vus' dan 'duration' statis tidak dipakai.
  stages: [
    { duration: '10s', target: 10 }, // ramp-up ke 10 VU dalam 10 detik
    { duration: '20s', target: 10 }, // tetap di 10 VU selama 20 detik (steady)
    { duration: '10s', target: 0 },  // ramp-down ke 0 VU dalam 10 detik
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'], // statistik summary
};

export default function () {
  http.get('https://test.k6.io');
  sleep(1); // jeda 1 detik setiap iterasi
}
