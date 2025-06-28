// ========== CONFIG ========== //
const staff = [
  { name: 'ภาณุวัฒน์', type: 'main' },
  { name: 'สุกัญญา', type: 'main' },
  { name: 'ณัทชกา', type: 'main' },
  { name: 'ดวงแก้ว', type: 'main' },
  { name: 'อรอุษา', type: 'main' },
  { name: 'อัมพร', type: 'main' },
  { name: 'ดวงพร', type: 'parttime' },
  { name: 'กาญจนา', type: 'parttime' },
  { name: 'สาริสา', type: 'parttime' },
  { name: 'รุ้งจินดา', type: 'parttime' },
];
const dutyTypes = [
  { code: 'ช', label: 'เช้า' },
  { code: 'บ', label: 'บ่าย' },
  { code: 'ด', label: 'ดึก' },
  { code: 'ชบ', label: 'เช้าบ่าย' },
  { code: 'ดบ', label: 'ดึกบ่าย' },
  { code: 'MB', label: 'แม่บ้าน' },
  { code: 'MBบ', label: 'แม่บ้านบ่าย' },
  { code: 'อ', label: 'อบรม' },
  { code: 'ดอ', label: 'ดึกอบรม' },
  { code: 'O', label: 'OFF' },
  { code: 'va', label: 'Vacation' },
];

// ========== UTILS ========== //
function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}
function getMonthName(month) {
  return [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ][month];
}
function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

// ========== DOM READY ========== //
document.addEventListener('DOMContentLoaded', () => {
  // โหลดเดือน/ปีล่าสุดจาก localStorage ถ้ามี
  const savedMonth = localStorage.getItem('selectedMonth');
  const savedYear = localStorage.getItem('selectedYear');
  if (savedMonth !== null) document.getElementById('month-select').value = savedMonth;
  if (savedYear !== null) document.getElementById('year-select').value = savedYear;
  loadDutyData();
  renderTable();
  document.getElementById('leave-btn').onclick = openLeaveModal;
  document.getElementById('parttime-btn').onclick = openParttimeModal;
  document.getElementById('off-btn').onclick = randomOffDays;
  const mbBtn = document.getElementById('mb-btn');
  if (mbBtn) mbBtn.onclick = assignMaidDuties;
  const autoDutyBtn = document.getElementById('auto-duty-btn');
  if (autoDutyBtn) autoDutyBtn.onclick = autoAssignDuties;
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.onclick = resetRoster;
  const hardResetBtn = document.getElementById('hardreset-btn');
  if (hardResetBtn) hardResetBtn.onclick = hardResetRoster;
  const overviewBtn = document.getElementById('overview-btn');
  if (overviewBtn) overviewBtn.onclick = showOverviewModal;
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.onclick = exportExcel;
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) saveBtn.onclick = exportExcelXLSX;
  // (ถ้ามี logic อื่นที่จำเป็นของระบบใหม่ ให้เพิ่มที่นี่)

  document.querySelectorAll('input[name="leave-type"]').forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'custom') {
        document.getElementById('weekly-checkboxes').style.display = 'none';
        document.getElementById('custom-date-picker').style.display = '';
      } else {
        document.getElementById('weekly-checkboxes').style.display = '';
        document.getElementById('custom-date-picker').style.display = 'none';
      }
    });
  });

  document.getElementById('month-select').addEventListener('change', function() {
    localStorage.setItem('selectedMonth', this.value);
    renderTable();
  });
  document.getElementById('year-select').addEventListener('change', function() {
    localStorage.setItem('selectedYear', this.value);
    renderTable();
  });
});

if (window.flatpickr) {
  flatpickr("#multi-date", {
    mode: "multiple",
    dateFormat: "Y-m-d",
    locale: "th"
  });
}

function getSelectedYear() {
  return +document.getElementById('year-select').value;
}

async function onMonthYearChange() {
  renderRosterTable();
}

// ========== RENDER MONTH/YEAR ========== //
function renderMonthYearDropdown() {
  const monthSelect = document.getElementById('month-select');
  const yearSelect = document.getElementById('year-select');
  const now = new Date();
  for (let m = 0; m < 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = getMonthName(m);
    if (m === now.getMonth()) opt.selected = true;
    monthSelect.appendChild(opt);
  }
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + 543;
    if (y === now.getFullYear()) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  monthSelect.onchange = yearSelect.onchange = renderRosterTable;
}

// ========== RENDER ROSTER TABLE ========== //
function renderRosterTable() {
  document.getElementById('roster-table').innerHTML = '';
}

function toggleUserHoliday(th) {
  const d = +th.getAttribute('data-day');
  const month = +document.getElementById('month-select').value;
  const year = +document.getElementById('year-select').value;
  let arr = getUserHolidays(year, month);
  if (arr.includes(d)) arr = arr.filter(x => x !== d);
  else arr.push(d);
  setUserHolidays(year, month, arr);
  renderRosterTable();
}

// ========== SUMMARY ========== //
function renderSummary(month, year) {
  const days = getDaysInMonth(month, year);
  let workdays = 0, weekends = 0, hols = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    if (isUserHoliday(date)) hols.push(d);
    else if (isWeekend(date)) weekends++;
    else workdays++;
  }
  let holStr = hols.length ? '<br>วันหยุด: ' + hols.join(', ') : '';
  document.getElementById('summary').innerHTML =
    `เดือน ${getMonthName(month)} ${year+543} : <b>${workdays}</b> วันทำการ, <b>${weekends}</b> เสาร์-อาทิตย์${holStr}`;
}

// ========== MODAL ========== //
function setupModal() {
  const modal = document.getElementById('modal');
  document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  window.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
}

let dutyData = {};

function getDutyKey(name, day) {
  return `${name}__${day}`;
}

function renderTable() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const days = getDaysInMonth(year, month);
  const customHolidays = loadCustomHolidays(year, month);

  // Render thead
  let theadHtml = '<thead><tr><th class="sticky-col">ชื่อเจ้าหน้าที่</th>';
  for (let i = 1; i <= days; i++) {
    let thClass = [];
    if (isWeekend(year, month, i)) thClass.push('weekend');
    if (customHolidays.includes(i)) thClass.push('holiday');
    theadHtml += `<th data-day="${i}"${thClass.length ? ` class="${thClass.join(' ')}"` : ''}>${i}</th>`;
  }
  theadHtml += '<th class="sum-col">รวม</th><th class="ot-col">OT</th></tr></thead>';

  // ฟังก์ชันนับเวรตามกติกา
  function countDutySum(name) {
    let sum = 0;
    for (let i = 1; i <= days; i++) {
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (!duty || duty === 'O') continue; // ไม่รวม OFF หรือว่าง
      if (["ชบ", "ดบ", "MBบ", "ดอ"].includes(duty)) sum += 2;
      else if (["ช", "บ", "ด", "อ", "va", "Va", "VA", "MB", "vac", "VAC"].includes(duty)) sum += 1;
      else sum += 1; // อื่นๆ นับ 1 เวร
    }
    return sum;
  }

  // คำนวณวันทำการ (workdays) ก่อนใช้ในลูปและใน template string
  let workdays = 0;
  for (let i = 1; i <= days; i++) {
    if (!isWeekend(year, month, i) && !customHolidays.includes(i)) workdays++;
  }

  // Render tbody
  let tbodyHtml = '<tbody>';
  for (const name of staff.map(s => s.name)) {
    tbodyHtml += `<tr><td class="sticky-col staff-name">${name}</td>`;
    for (let i = 1; i <= days; i++) {
      let tdClass = [];
      if (isWeekend(year, month, i)) tdClass.push('weekend');
      if (customHolidays.includes(i)) tdClass.push('holiday');
      // ไฮไลท์ cell ถ้า missingDutyCells มีเวรขาดในวันนั้น
      if (window.missingDutyCells && staff.find(s => s.name === name).type === 'main') {
        let isMissing = false;
        for (const miss of window.missingDutyCells) {
          if (miss.day === i && miss.color === 'red') {
            const dutyObj = dutyData[getDutyKey(name, i)];
            const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
            if (
              (miss.type === 'morning' && (duty === 'ช' || duty === 'ชบ')) ||
              (miss.type === 'afternoon' && (duty === 'บ' || duty === 'ชบ' || duty === 'ดบ' || duty === 'MBบ')) ||
              (miss.type === 'night' && (duty === 'ด' || duty === 'ดบ'))
            ) {
              isMissing = true;
              break;
            }
            if (!duty && (
              (miss.type === 'morning' && name) ||
              (miss.type === 'afternoon' && name) ||
              (miss.type === 'night' && name)
            )) {
              isMissing = true;
              break;
            }
          }
        }
        if (isMissing) tdClass.push('missing-duty-red');
      }
      let cellContent = '';
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      // กำหนดคลาสและเนื้อหาแต่ละเวร
      if (duty === 'MB') {
        tdClass.push('cell-mb');
        cellContent = 'MB';
      } else if (duty === 'MBบ') {
        tdClass.push('cell-mbb');
        cellContent = '<span class="mb">MB</span><span class="b">บ</span>';
      } else if (duty === 'O') {
        tdClass.push('cell-o');
        cellContent = 'O';
      } else if (duty === 'va' || duty === 'Va' || duty === 'VA') {
        tdClass.push('cell-va');
        cellContent = 'VAC';
      } else if (duty === 'อ') {
        tdClass.push('cell-training');
        cellContent = 'อ';
      } else if (duty === 'ดอ') {
        tdClass.push('cell-night-training');
        cellContent = '<span class="d">ด</span><span class="a">อ</span>';
      } else {
        cellContent = duty;
      }
      tbodyHtml += `<td data-name="${name}" data-day="${i}"${tdClass.length ? ` class="${tdClass.join(' ')}"` : ''}>${cellContent}</td>`;
    }
    // เพิ่มคอลัมน์รวมและ OT
    const sum = countDutySum(name);
    const ot = Math.max(0, sum - workdays);
    tbodyHtml += `<td class="sum-col">${sum}</td><td class="ot-col">${ot}</td>`;
    tbodyHtml += '</tr>';
  }
  tbodyHtml += '</tbody>';

  table.innerHTML = theadHtml + tbodyHtml;

  // Add click event to th for toggling holiday
  const ths = table.querySelectorAll('thead th[data-day]');
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const day = Number(th.getAttribute('data-day'));
      let holidays = loadCustomHolidays(year, month);
      if (holidays.includes(day)) {
        holidays = holidays.filter(d => d !== day);
      } else {
        holidays.push(day);
      }
      saveCustomHolidays(year, month, holidays);
      renderTable();
    });
  });

  // Add click event to td for popup modal
  const tds = table.querySelectorAll('tbody td[data-name][data-day]');
  tds.forEach(td => {
    td.addEventListener('click', (e) => {
      e.stopPropagation();
      openDutyModal(td);
    });
  });

  updateSummary();
  renderDutySummary();
}

function openDutyModal(td) {
  const name = td.getAttribute('data-name');
  const day = td.getAttribute('data-day');
  const modal = document.getElementById('modal');
  let html = `<div style="font-size:1.2em;font-weight:700;margin-bottom:1.2em;">เลือกเวรให้ <span style='color:#1976d2;'>${name}</span> (วันที่ <span style='color:#1976d2;'>${day}</span>)</div>`;
  html += '<div style="display:flex;flex-wrap:wrap;gap:0.7rem;justify-content:center;">';
  dutyTypes.forEach(d => {
    if ((d.code === 'MB' || d.code === 'MBบ') && !(name === 'ภาณุวัฒน์' || name === 'สุกัญญา')) return;
    let btnClass = 'duty-btn';
    if (d.code === 'MB') btnClass += ' mb';
    if (d.code === 'MBบ') btnClass += ' mb-b';
    if (d.code === 'O') btnClass += ' off';
    if (d.code === 'va') btnClass += ' vac';
    if (d.code === 'อ') btnClass += ' training';
    if (d.code === 'ดอ') btnClass += ' night-training';
    html += `<button class="${btnClass}" data-code="${d.code}" data-name="${name}" data-day="${day}">${d.label}</button>`;
  });
  html += `<button class="duty-btn" style="background:#eee;color:#222;border:1.5px solid #bbb;" data-code="" data-name="${name}" data-day="${day}">ลบเวร</button>`;
  html += '</div>';
  html += `<button class="close-btn" type="button">&times;</button>`;
  modal.innerHTML = html;
  modal.classList.remove('hidden');

  // ปิด modal
  const closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

  // เลือกเวร
  modal.querySelectorAll('button.duty-btn').forEach(btn => {
    btn.onclick = function() {
      const code = btn.getAttribute('data-code');
      const name = btn.getAttribute('data-name');
      const day = btn.getAttribute('data-day');
      const key = getDutyKey(name, day);
      if (code) {
        dutyData[key] = { code, manual: true };
      } else {
        delete dutyData[key];
      }
      saveDutyData();
      modal.classList.add('hidden');
      renderTable();
    };
  });
}

// ========== RESET & EXPORT ========== //
function resetRoster() {
  const mainStaff = staff.filter(s => s.type === 'main').map(s => s.name);
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const days = getDaysInMonth(year, month);
  for (const name of mainStaff) {
    for (let day = 1; day <= days; day++) {
      const key = getDutyKey(name, day);
      const val = dutyData[key];
      if (!val) continue;
      if (typeof val === 'object' && val.manual === true) continue; // ถ้าเลือกเอง ไม่ลบ
      delete dutyData[key];
    }
  }
  saveDutyData();
  renderTable();
  renderDutySummary && renderDutySummary();
  currentAutoDutyDay = 1;
}

function exportExcel() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const staffNames = staff.map(s => s.name);
  const customHolidays = loadCustomHolidays(year, month);
  // คำนวณวันทำการ
  let workdays = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    if (!isWeekend(year, month, i) && !customHolidays.includes(i)) workdays++;
  }
  // ฟังก์ชันนับเวร
  function countDutySum(name) {
    let sum = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (!duty || duty === 'O') continue;
      if (["ชบ", "ดบ", "MBบ", "ดอ"].includes(duty)) sum += 2;
      else if (["ช", "บ", "ด", "อ", "va", "Va", "VA", "MB", "vac", "VAC"].includes(duty)) sum += 1;
      else sum += 1;
    }
    return sum;
  }
  // Header
  let header = ['ชื่อเจ้าหน้าที่'];
  for (let i = 1; i <= daysInMonth; i++) header.push(i);
  header.push('รวม', 'OT');
  let rows = [header];
  // Body
  for (const name of staffNames) {
    let row = [name];
    for (let i = 1; i <= daysInMonth; i++) {
      row.push((typeof dutyData[getDutyKey(name, i)] === 'object' ? dutyData[getDutyKey(name, i)].code : dutyData[getDutyKey(name, i)]) || '');
    }
    const sum = countDutySum(name);
    const ot = Math.max(0, sum - workdays);
    row.push(sum, ot);
    rows.push(row);
  }
  // Summary
  let mainStaff = staff.filter(s => s.type === 'main').map(s => s.name);
  let sumRow = (label, fn) => {
    let row = [label];
    for (let d = 1; d <= daysInMonth; d++) {
      let count = 0;
      for (const name of mainStaff) {
        const dutyObj = dutyData[getDutyKey(name, d)];
        const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
        if (fn(duty)) count++;
      }
      row.push(count);
    }
    row.push('', ''); // ช่องว่างใต้ รวม/OT
    return row;
  };
  rows.push(sumRow('สรุปเวรเช้า', d => d === 'ช' || d === 'ชบ'));
  rows.push(sumRow('สรุปเวรบ่าย', d => d === 'บ' || d === 'ชบ' || d === 'ดบ' || d === 'MBบ'));
  rows.push(sumRow('สรุปเวรดึก', d => d === 'ด' || d === 'ดบ'));
  // แปลงเป็น CSV
  let csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\r\n');
  let blob = new Blob(['\uFEFF' + csv], {type: 'text/csv'});
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = `duty_roster_${year + 543}_${month + 1}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportExcelXLSX() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const staffNames = staff.map(s => s.name);
  const customHolidays = loadCustomHolidays(year, month);
  // คำนวณวันทำการ
  let workdays = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    if (!isWeekend(year, month, i) && !customHolidays.includes(i)) workdays++;
  }
  // ฟังก์ชันนับเวร
  function countDutySum(name) {
    let sum = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (!duty || duty === 'O') continue;
      if (["ชบ", "ดบ", "MBบ", "ดอ"].includes(duty)) sum += 2;
      else if (["ช", "บ", "ด", "อ", "va", "Va", "VA", "MB", "vac", "VAC"].includes(duty)) sum += 1;
      else sum += 1;
    }
    return sum;
  }
  let ws_data = [];
  ws_data.push([`ตารางเวรเดือน ${getMonthName(month)} ${year+543}`]);
  // Header
  let header = ['ชื่อเจ้าหน้าที่'];
  for (let i = 1; i <= daysInMonth; i++) header.push(i);
  header.push('รวม', 'OT');
  ws_data.push(header);
  // Body
  for (const name of staffNames) {
    let row = [name];
    for (let i = 1; i <= daysInMonth; i++) {
      row.push((typeof dutyData[getDutyKey(name, i)] === 'object' ? dutyData[getDutyKey(name, i)].code : dutyData[getDutyKey(name, i)]) || '');
    }
    const sum = countDutySum(name);
    const ot = Math.max(0, sum - workdays);
    row.push(sum, ot);
    ws_data.push(row);
  }
  // Summary
  let mainStaff = staff.filter(s => s.type === 'main').map(s => s.name);
  let sumRow = (label, fn) => {
    let row = [label];
    for (let d = 1; d <= daysInMonth; d++) {
      let count = 0;
      for (const name of mainStaff) {
        const dutyObj = dutyData[getDutyKey(name, d)];
        const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
        if (fn(duty)) count++;
      }
      row.push(count);
    }
    row.push('', ''); // ช่องว่างใต้ รวม/OT
    return row;
  };
  ws_data.push(sumRow('สรุปเวรเช้า', d => d === 'ช' || d === 'ชบ'));
  ws_data.push(sumRow('สรุปเวรบ่าย', d => d === 'บ' || d === 'ชบ' || d === 'ดบ' || d === 'MBบ'));
  ws_data.push(sumRow('สรุปเวรดึก', d => d === 'ด' || d === 'ดบ'));

  // สร้าง worksheet และ workbook
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // ใส่สีแต่ละ cell ตามเวร/วันหยุด/weekend/เวรขาด
  for (let r = 2; r < 2 + staffNames.length; r++) {
    for (let c = 1; c <= daysInMonth; c++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (!cell) continue;
      const val = cell.v;
      const day = c; // 1-based
      if (customHolidays.includes(day)) {
        cell.s = { fill: { fgColor: { rgb: 'FFE0E0' } } };
      } else if (isWeekend(year, month, day)) {
        cell.s = { fill: { fgColor: { rgb: 'E1F5FE' } } };
      }
      if (val === 'MB' || val === 'MBบ') {
        cell.s = { fill: { fgColor: { rgb: 'B9F6CA' } }, font: { color: { rgb: '1B5E20' }, bold: true } };
      }
      if (val === 'O' || val === 'VAC' || val === 'va' || val === 'Va' || val === 'VA') {
        cell.s = { fill: { fgColor: { rgb: 'FFCDD2' } }, font: { color: { rgb: 'B71C1C' }, bold: true } };
      }
      if (val === 'อ') {
        cell.s = { fill: { fgColor: { rgb: 'FFF9C4' } }, font: { color: { rgb: 'FBC02D' }, bold: true } };
      }
      if (val === 'ดอ') {
        cell.s = { fill: { fgColor: { rgb: 'FFE0B2' } }, font: { color: { rgb: 'F57C00' }, bold: true } };
      }
      if (window.missingDutyCells) {
        const miss = window.missingDutyCells.find(e => e.day === day);
        if (miss) {
          cell.s = { fill: { fgColor: { rgb: 'B9F6CA' } } };
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Duty Roster');
  XLSX.writeFile(wb, `duty_roster_${year + 543}_${month + 1}.xlsx`);
}

// ========== LEAVE MODAL ========== //
function closeLeaveModal() {
  document.getElementById('leave-modal').classList.add('hidden');
}

function openLeaveModal() {
  const modal = document.getElementById('leave-modal');
  modal.classList.remove('hidden');

  // เติมรายชื่อเจ้าหน้าที่
  const staffList = [
    "ภาณุวัฒน์", "สุกัญญา", "ณัทชกา", "ดวงแก้ว", "อรอุษา", "อัมพร",
    "ดวงพร", "กาญจนา", "สาริสา", "รุ้งจินดา"
  ];
  const select = modal.querySelector('#leave-staff');
  if (select) {
    select.innerHTML = '';
    staffList.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  // initialize flatpickr ทุกครั้งที่เปิด modal
  if (window.flatpickr) {
    flatpickr("#multi-date", {
      mode: "multiple",
      dateFormat: "Y-m-d",
      locale: "th"
    });
  }

  // ผูก event ให้ปุ่มบันทึกและกากบาททุกครั้ง
  const saveBtn = modal.querySelector('#leave-save-btn');
  if (saveBtn) saveBtn.onclick = applyLeave;
  const closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) closeBtn.onclick = closeLeaveModal;
}

// ===== HARD CODED HOLIDAYS 2025-2027 =====
const hardcodedHolidays = [
  // 2025
  { date: '2025-01-01', name: 'วันขึ้นปีใหม่', type: 'public' },
  { date: '2025-02-19', name: 'วันมาฆบูชา', type: 'public' },
  { date: '2025-04-06', name: 'วันจักรี', type: 'public' },
  { date: '2025-04-14', name: 'วันสงกรานต์', type: 'public' },
  { date: '2025-04-15', name: 'วันสงกรานต์', type: 'public' },
  { date: '2025-04-16', name: 'วันสงกรานต์', type: 'public' },
  { date: '2025-05-01', name: 'วันแรงงานแห่งชาติ', type: 'public' },
  { date: '2025-05-05', name: 'วันฉัตรมงคล', type: 'public' },
  { date: '2025-05-12', name: 'วันพืชมงคล', type: 'public' },
  { date: '2025-05-14', name: 'วันวิสาขบูชา', type: 'public' },
  { date: '2025-07-11', name: 'วันอาสาฬหบูชา', type: 'public' },
  { date: '2025-07-12', name: 'วันเข้าพรรษา', type: 'public' },
  { date: '2025-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', type: 'public' },
  { date: '2025-08-12', name: 'วันแม่แห่งชาติ', type: 'public' },
  { date: '2025-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'public' },
  { date: '2025-10-23', name: 'วันปิยมหาราช', type: 'public' },
  { date: '2025-12-05', name: 'วันพ่อแห่งชาติ', type: 'public' },
  { date: '2025-12-10', name: 'วันรัฐธรรมนูญ', type: 'public' },
  { date: '2025-12-31', name: 'วันสิ้นปี', type: 'public' },
  // 2026
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่', type: 'public' },
  { date: '2026-02-08', name: 'วันมาฆบูชา', type: 'public' },
  { date: '2026-04-06', name: 'วันจักรี', type: 'public' },
  { date: '2026-04-13', name: 'วันสงกรานต์', type: 'public' },
  { date: '2026-04-14', name: 'วันสงกรานต์', type: 'public' },
  { date: '2026-04-15', name: 'วันสงกรานต์', type: 'public' },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', type: 'public' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล', type: 'public' },
  { date: '2026-05-06', name: 'วันพืชมงคล', type: 'public' },
  { date: '2026-05-24', name: 'วันวิสาขบูชา', type: 'public' },
  { date: '2026-07-01', name: 'วันอาสาฬหบูชา', type: 'public' },
  { date: '2026-07-02', name: 'วันเข้าพรรษา', type: 'public' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', type: 'public' },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ', type: 'public' },
  { date: '2026-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'public' },
  { date: '2026-10-23', name: 'วันปิยมหาราช', type: 'public' },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ', type: 'public' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', type: 'public' },
  { date: '2026-12-31', name: 'วันสิ้นปี', type: 'public' },
  // 2027
  { date: '2027-01-01', name: 'วันขึ้นปีใหม่', type: 'public' },
  { date: '2027-01-28', name: 'วันมาฆบูชา', type: 'public' },
  { date: '2027-04-06', name: 'วันจักรี', type: 'public' },
  { date: '2027-04-13', name: 'วันสงกรานต์', type: 'public' },
  { date: '2027-04-14', name: 'วันสงกรานต์', type: 'public' },
  { date: '2027-04-15', name: 'วันสงกรานต์', type: 'public' },
  { date: '2027-05-01', name: 'วันแรงงานแห่งชาติ', type: 'public' },
  { date: '2027-05-03', name: 'วันฉัตรมงคล', type: 'public' },
  { date: '2027-05-26', name: 'วันวิสาขบูชา', type: 'public' },
  { date: '2027-06-20', name: 'วันอาสาฬหบูชา', type: 'public' },
  { date: '2027-06-21', name: 'วันเข้าพรรษา', type: 'public' },
  { date: '2027-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', type: 'public' },
  { date: '2027-08-12', name: 'วันแม่แห่งชาติ', type: 'public' },
  { date: '2027-10-13', name: 'วันคล้ายวันสวรรคต ร.9', type: 'public' },
  { date: '2027-10-23', name: 'วันปิยมหาราช', type: 'public' },
  { date: '2027-12-05', name: 'วันพ่อแห่งชาติ', type: 'public' },
  { date: '2027-12-10', name: 'วันรัฐธรรมนูญ', type: 'public' },
  { date: '2027-12-31', name: 'วันสิ้นปี', type: 'public' },
];

// ===== CUSTOM HOLIDAYS (localStorage) =====
function getCustomHolidays(year, month) {
  const key = `customHolidays-${year}-${month}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function setCustomHolidays(year, month, arr) {
  const key = `customHolidays-${year}-${month}`;
  localStorage.setItem(key, JSON.stringify(arr));
}

// ===== USER-SELECTED HOLIDAYS ONLY =====
function getUserHolidays(year, month) {
  const key = `userHolidays-${year}-${month}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function setUserHolidays(year, month, arr) {
  const key = `userHolidays-${year}-${month}`;
  localStorage.setItem(key, JSON.stringify(arr));
}
function isUserHoliday(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const arr = getUserHolidays(y, m);
  return arr.includes(d);
}

const staffNames = [
  "ภาณุวัฒน์", "สุกัญญา", "ณัทชกา", "ดวงแก้ว", "อรอุษา", "อัมพร",
  "ดวงพร", "กาญจนา", "สาริสา", "รุ้งจินดา"
];

const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const table = document.getElementById('duty-table');

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isWeekend(year, month, day) {
  const d = new Date(year, month, day);
  return d.getDay() === 0 || d.getDay() === 6;
}

function getHolidayKey(year, month) {
  return `${year}-${month}`;
}

function loadCustomHolidays(year, month) {
  const key = getHolidayKey(year, month);
  const data = localStorage.getItem('customHolidays');
  if (!data) return [];
  const obj = JSON.parse(data);
  return obj[key] || [];
}

function saveCustomHolidays(year, month, holidays) {
  const key = getHolidayKey(year, month);
  let obj = {};
  const data = localStorage.getItem('customHolidays');
  if (data) obj = JSON.parse(data);
  obj[key] = holidays;
  localStorage.setItem('customHolidays', JSON.stringify(obj));
}

function updateSummary() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const days = getDaysInMonth(year, month);
  const customHolidays = loadCustomHolidays(year, month);
  let workdays = 0;
  for (let i = 1; i <= days; i++) {
    if (!isWeekend(year, month, i) && !customHolidays.includes(i)) workdays++;
  }
  document.getElementById('summary').innerHTML = `เดือน ${monthSelect.options[month].text} ${year+543} : <b>${workdays}</b> วันทำการ`;
}

monthSelect.addEventListener('change', renderTable);
yearSelect.addEventListener('change', renderTable);
document.addEventListener('DOMContentLoaded', renderTable);

function randomOffDays() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const staffMain = staffNames.slice(0, 6); // ตัวจริง 6 คนแรก
  const minOff = 4, maxOff = 5; // OFF ต่อคนต่อเดือน
  const minGap = 2; // เว้นอย่างน้อย 1 วันระหว่างวัน OFF ของแต่ละคน (เช่น 1, 3, 5)

  // เตรียมตารางวัน OFF ของแต่ละคน (เฉพาะตัวเอง)
  let allOffDays = {};
  for (const name of staffMain) {
    allOffDays[name] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (dutyData[getDutyKey(name, d)] === 'O') {
        allOffDays[name].push(d);
      }
    }
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  for (const name of staffMain) {
    let currentOff = allOffDays[name].slice();
    let offCount = currentOff.length;
    let offTarget = minOff + Math.floor(Math.random() * (maxOff - minOff + 1));
    // สุ่มวัน OFF เพิ่มจนถึงเป้าหมาย
    let availableDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      // วันนั้นต้องไม่ติดกับวัน OFF เดิมหรือใหม่ของตัวเอง (เช่น 1,2 หรือ 2,3 ไม่ได้)
      let nearOwnOff = currentOff.some(od => Math.abs(od - d) < minGap);
      if (!nearOwnOff && dutyData[getDutyKey(name, d)] !== 'O') {
        availableDays.push(d);
      }
    }
    // สุ่มแบบ shuffle เพื่อความเป็นธรรมชาติ
    availableDays = shuffle(availableDays);
    while (offCount < offTarget && availableDays.length > 0) {
      const day = availableDays.shift();
      currentOff.push(day);
      offCount++;
      // หลังเพิ่มวันใหม่ ต้องลบวันข้างเคียงออกจาก availableDays ทันที เพื่อป้องกันติดกัน
      availableDays = availableDays.filter(d => Math.abs(d - day) >= minGap);
    }
    // อัปเดต dutyData เฉพาะวันที่ยังไม่มี O
    for (const d of currentOff) {
      const key = getDutyKey(name, d);
      if (typeof dutyData[key] === 'object' && dutyData[key].manual) continue;
      if (dutyData[key] !== 'O') {
        dutyData[key] = 'O';
      }
    }
  }
  saveDutyData();
  renderTable();
}

function assignMaidDuties() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const getDayOfWeek = d => new Date(year, month, d).getDay();
  const isHoliday = d => isWeekend(year, month, d) || loadCustomHolidays(year, month).includes(d);

  // 1. MB ภาณุวัฒน์: อังคาร-พฤหัสฯ สุ่ม 2 วัน/สัปดาห์ (วันทำการ)
  for (let week = 0; week < 6; week++) {
    // หาวันอังคาร-พฤหัสฯ ของสัปดาห์นี้
    let weekDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const w = Math.floor((d - 1) / 7);
      if (w === week && [2,3,4].includes(date.getDay()) && !isHoliday(d)) {
        weekDays.push(d);
      }
    }
    if (weekDays.length > 0) {
      // สุ่ม 2 วัน (หรือเท่าที่หาได้)
      let pick = shuffle(weekDays).slice(0, 2);
      pick.forEach(d => {
        const key = getDutyKey('ภาณุวัฒน์', d);
        if (typeof dutyData[key] === 'object' && dutyData[key].manual) return;
        dutyData[key] = 'MB';
      });
    }
  }

  // 2. MB สุกัญญา: จันทร์+ศุกร์ ทุกสัปดาห์ (วันทำการ)
  for (let week = 0; week < 6; week++) {
    let monFri = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const w = Math.floor((d - 1) / 7);
      if (w === week && [1,5].includes(date.getDay()) && !isHoliday(d)) {
        monFri.push(d);
      }
    }
    monFri.forEach(d => {
      const key = getDutyKey('สุกัญญา', d);
      if (typeof dutyData[key] === 'object' && dutyData[key].manual) return;
      dutyData[key] = 'MB';
    });
  }

  // 3. MBบ สุกัญญา: สุ่ม 2 เวร/เดือน จากวันจันทร์หรือศุกร์ (วันทำการ)
  let mbbDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = getDayOfWeek(d);
    if ([1,5].includes(dow) && !isHoliday(d)) {
      mbbDays.push(d);
    }
  }
  mbbDays = shuffle(mbbDays).slice(0, 2);
  mbbDays.forEach(d => {
    const key = getDutyKey('สุกัญญา', d);
    if (typeof dutyData[key] === 'object' && dutyData[key].manual) return;
    dutyData[key] = 'MBบ';
  });

  saveDutyData();
  renderTable();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

let currentAutoDutyDay = 1;

function autoAssignDuties() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const mainStaff = staff.filter(s => s.type === 'main').map(s => s.name);
  if (!window.missingDutyCells) window.missingDutyCells = [];
  window.missingDutyCells = [];

  while (currentAutoDutyDay <= daysInMonth) {
    let changed = false;
    do {
      changed = false;
      const d = currentAutoDutyDay;
      let morning = [], afternoon = [], night = [];
      // 1. ตรวจสอบเวรที่มีอยู่
      for (const name of mainStaff) {
        const duty = dutyData[getDutyKey(name, d)];
        if (duty === 'ช' || (typeof duty === 'object' && duty.code === 'ช')) morning.push(name);
        if (duty === 'บ' || (typeof duty === 'object' && duty.code === 'บ')) afternoon.push(name);
        if (duty === 'ด' || (typeof duty === 'object' && duty.code === 'ด')) night.push(name);
        if (duty === 'ชบ' || (typeof duty === 'object' && duty.code === 'ชบ')) { morning.push(name); afternoon.push(name); }
        if (duty === 'ดบ' || (typeof duty === 'object' && duty.code === 'ดบ')) { night.push(name); afternoon.push(name); }
        if (duty === 'MBบ' || (typeof duty === 'object' && duty.code === 'MBบ')) afternoon.push(name);
      }
      // 1. เติมช่องว่างก่อน
      function getAvailableForShift(shift) {
        // ป้องกัน error ถ้ายังไม่ได้เซ็ตวัน
        if (!window.sukanyaChbDays) window.sukanyaChbDays = [];
        if (!window.sukanyaMbBdays) window.sukanyaMbBdays = [];
        return mainStaff.filter(name => {
          // เงื่อนไขพิเศษสำหรับภาณุวัฒน์
          if (name === 'ภาณุวัฒน์') {
            const date = new Date(year, month, d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend) {
              // เสาร์-อาทิตย์: ห้ามเวรเช้า/บ่าย/ชบ/ดบ
              if (shift !== 'night') return false;
            }
          }
          // เงื่อนไขพิเศษสำหรับสุกัญญา
          if (name === 'สุกัญญา') {
            // ไม่สุ่มเวรดบ
            if (shift === 'afternoon' && window.sukanyaMbBdays.includes(d)) return false; // MBบ วันนี้
            if (shift === 'afternoon' && window.sukanyaChbDays.includes(d)) return false; // ชบ วันนี้
            if (shift === 'afternoon' && !window.sukanyaMbBdays.includes(d) && !window.sukanyaChbDays.includes(d)) return false; // ไม่ให้บ่ายปกติ
            if (shift === 'night' && window.sukanyaMbBdays.includes(d)) return false; // MBบ วันนี้
            if (shift === 'night' && window.sukanyaChbDays.includes(d)) return false; // ชบ วันนี้
          }
          const duty = dutyData[getDutyKey(name, d)];
          if (typeof duty === 'object' && duty.manual) return false;
          if (duty === 'vac' || duty === 'อ' || duty === 'ดอ' || duty === 'MB' || duty === 'MBบ') return false;
          if (typeof duty === 'object' && (duty.code === 'vac' || duty.code === 'อ' || duty.code === 'ดอ' || duty.code === 'MB' || duty.code === 'MBบ')) return false;
          if (duty === 'O') return false;
          if (typeof duty === 'object' && duty.code === 'O') return false;
          if (duty) return false;
          // ไม่สุ่มเวรบ/ชบ/ดบ ให้ภาณุวัฒน์เลย
          if (name === 'ภาณุวัฒน์' && (shift === 'afternoon' || shift === 'double')) return false;
          return true;
        });
      }
      // เช้า
      while (morning.length < 2) {
        let available = getAvailableForShift('morning');
        if (available.length === 0) break;
        let idx = Math.floor(Math.random() * available.length);
        let name = available.splice(idx, 1)[0];
        dutyData[getDutyKey(name, d)] = { code: 'ช' };
        morning.push(name);
        changed = true;
      }
      // บ่าย
      while (afternoon.length < 2) {
        let available = getAvailableForShift('afternoon');
        if (available.length === 0) break;
        let idx = Math.floor(Math.random() * available.length);
        let name = available.splice(idx, 1)[0];
        dutyData[getDutyKey(name, d)] = { code: 'บ' };
        afternoon.push(name);
        changed = true;
      }
      // ดึก
      while (night.length < 2) {
        let available = getAvailableForShift('night');
        if (available.length === 0) break;
        let idx = Math.floor(Math.random() * available.length);
        let name = available.splice(idx, 1)[0];
        dutyData[getDutyKey(name, d)] = { code: 'ด' };
        night.push(name);
        changed = true;
      }
      // 2. อัปเกรดเวรเดี่ยวเป็นเวรคู่ (ถ้ายังไม่ครบ)
      function upgradeSingleToDouble(shift, codeSingle, codeDouble, pushTo) {
        let candidates = mainStaff.filter(name => {
          if (name === 'ภาณุวัฒน์') {
            const date = new Date(year, month, d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (isWeekend) return false; // วันหยุดห้ามอัปเกรดใด ๆ ให้ภาณุวัฒน์
            return false; // ไม่อัปเกรดเวรเดี่ยวเป็นชบ/ดบให้ภาณุวัฒน์เลย
          }
          if (name === 'สุกัญญา') return false;
          const duty = dutyData[getDutyKey(name, d)];
          if (typeof duty !== 'object' || duty.manual) return false;
          if (duty.code !== codeSingle) return false;
          return true;
        });
        while (pushTo.length < 2 && candidates.length > 0) {
          let idx = Math.floor(Math.random() * candidates.length);
          let name = candidates.splice(idx, 1)[0];
          dutyData[getDutyKey(name, d)] = { code: codeDouble };
          if (codeDouble === 'ชบ') { morning.push(name); afternoon.push(name); }
          if (codeDouble === 'ดบ') { night.push(name); afternoon.push(name); }
          pushTo.push(name);
          changed = true;
        }
      }
      if (morning.length < 2) upgradeSingleToDouble('morning', 'ช', 'ชบ', morning);
      if (afternoon.length < 2) {
        let candidates = mainStaff.filter(name => {
          const duty = dutyData[getDutyKey(name, d)];
          if (typeof duty !== 'object' || duty.manual) return false;
          if (duty.code !== 'บ') return false;
          return true;
        });
        while (afternoon.length < 2 && candidates.length > 0) {
          let idx = Math.floor(Math.random() * candidates.length);
          let name = candidates.splice(idx, 1)[0];
          let upgrade = Math.random() < 0.5 ? 'ชบ' : 'ดบ';
          dutyData[getDutyKey(name, d)] = { code: upgrade };
          if (upgrade === 'ชบ') morning.push(name);
          if (upgrade === 'ดบ') night.push(name);
          afternoon.push(name);
          changed = true;
        }
      }
      if (night.length < 2) upgradeSingleToDouble('night', 'ด', 'ดบ', night);
      // 4. ถ้ายังไม่ครบ 2 คนในเวรใด ให้ขึ้นสีแดง
      ['morning','afternoon','night'].forEach(type => {
        const arr = window.missingDutyCells.filter(e => !(e.type === type && e.day === d));
        window.missingDutyCells = arr;
      });
      if (morning.length < 2) window.missingDutyCells.push({ type: 'morning', day: d, color: 'red' });
      if (afternoon.length < 2) window.missingDutyCells.push({ type: 'afternoon', day: d, color: 'red' });
      if (night.length < 2) window.missingDutyCells.push({ type: 'night', day: d, color: 'red' });
      saveDutyData();
      renderTable();
      renderDutySummary();
    } while (changed);
    currentAutoDutyDay++;
    break;
  }
}

function renderDutySummary() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const staffNames = staff.map(s => s.name);
  let morningRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรเช้า</td>';
  let afternoonRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรบ่าย</td>';
  let nightRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรดึก</td>';
  for (let d = 1; d <= daysInMonth; d++) {
    let morning = 0, afternoon = 0, night = 0;
    for (const name of staffNames) {
      const dutyObj = dutyData[getDutyKey(name, d)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (duty === 'ช' || duty === 'ชบ') morning++;
      if (duty === 'บ' || duty === 'ชบ' || duty === 'ดบ' || duty === 'MBบ') afternoon++;
      if (duty === 'ด' || duty === 'ดบ') night++;
    }
    morningRow += `<td class="summary-cell">${morning}</td>`;
    afternoonRow += `<td class="summary-cell">${afternoon}</td>`;
    nightRow += `<td class="summary-cell">${night}</td>`;
  }
  morningRow += '</tr>';
  afternoonRow += '</tr>';
  nightRow += '</tr>';
  // แทรกแถวสรุปต่อท้าย tbody ของ #duty-table
  let table = document.getElementById('duty-table');
  let tbody = table.querySelector('tbody');
  // ลบแถวสรุปเดิมถ้ามี
  tbody.querySelectorAll('.summary-row').forEach(row => row.remove());
  tbody.insertAdjacentHTML('beforeend', morningRow + afternoonRow + nightRow);
}

function saveDutyData() {
  localStorage.setItem('dutyData', JSON.stringify(dutyData));
}
function loadDutyData() {
  const data = localStorage.getItem('dutyData');
  if (data) {
    dutyData = JSON.parse(data);
  } else {
    dutyData = {};
  }
}

function hardResetRoster() {
  if (!confirm('ต้องการล้างข้อมูลเวรทั้งหมดในเดือนนี้จริงหรือไม่?')) return;
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const days = getDaysInMonth(year, month);
  // ลบ dutyData เฉพาะเดือน/ปีนี้
  for (const key in dutyData) {
    // key = "ชื่อ__วัน" เช่น "ภาณุวัฒน์__1"
    const [name, dayStr] = key.split('__');
    const day = Number(dayStr);
    if (day >= 1 && day <= days) {
      delete dutyData[key];
    }
  }
  saveDutyData();
  renderTable();
  renderDutySummary && renderDutySummary();
  currentAutoDutyDay = 1;
}

function showOverviewModal() {
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  const daysInMonth = getDaysInMonth(year, month);
  const customHolidays = loadCustomHolidays(year, month);
  // คำนวณวันทำการ (workdays) ให้แน่ใจว่าใช้ daysInMonth และอยู่ก่อนใช้งาน
  let workdays = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    if (!isWeekend(year, month, i) && !customHolidays.includes(i)) workdays++;
  }
  const staffNames = staff.map(s => s.name);
  const mainStaff = staff.filter(s => s.type === 'main').map(s => s.name);
  let tableHtml = '<table class="overview-table">';
  // Header
  tableHtml += '<thead><tr><th class="sticky-col">ชื่อเจ้าหน้าที่</th>';
  for (let i = 1; i <= daysInMonth; i++) {
    let thClass = [];
    if (isWeekend(year, month, i)) thClass.push('weekend');
    if (customHolidays.includes(i)) thClass.push('holiday');
    tableHtml += `<th${thClass.length ? ` class="${thClass.join(' ')}"` : ''}>${i}</th>`;
  }
  tableHtml += '<th class="sum-col">รวม</th><th class="ot-col">OT</th></tr></thead>';
  // ฟังก์ชันนับเวรตามกติกา (เหมือน renderTable)
  function countDutySum(name) {
    let sum = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (!duty || duty === 'O') continue;
      if (["ชบ", "ดบ", "MBบ", "ดอ"].includes(duty)) sum += 2;
      else if (["ช", "บ", "ด", "อ", "va", "Va", "VA", "MB", "vac", "VAC"].includes(duty)) sum += 1;
      else sum += 1;
    }
    return sum;
  }
  // Body
  tableHtml += '<tbody>';
  for (const name of staffNames) {
    tableHtml += `<tr><td class="sticky-col staff-name">${name}</td>`;
    for (let i = 1; i <= daysInMonth; i++) {
      let tdClass = [];
      if (isWeekend(year, month, i)) tdClass.push('weekend');
      if (customHolidays.includes(i)) tdClass.push('holiday');
      let cellContent = '';
      const dutyObj = dutyData[getDutyKey(name, i)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (duty === 'MB') {
        tdClass.push('cell-mb');
        cellContent = 'MB';
      } else if (duty === 'MBบ') {
        tdClass.push('cell-mbb');
        cellContent = '<span class="mb">MB</span><span class="b">บ</span>';
      } else if (duty === 'O') {
        tdClass.push('cell-o');
        cellContent = 'O';
      } else if (duty === 'va' || duty === 'Va' || duty === 'VA') {
        tdClass.push('cell-va');
        cellContent = 'VAC';
      } else if (duty === 'อ') {
        tdClass.push('cell-training');
        cellContent = 'อ';
      } else if (duty === 'ดอ') {
        tdClass.push('cell-night-training');
        cellContent = '<span class="d">ด</span><span class="a">อ</span>';
      } else {
        cellContent = duty;
      }
      tableHtml += `<td${tdClass.length ? ` class="${tdClass.join(' ')}"` : ''}>${cellContent}</td>`;
    }
    // เพิ่มคอลัมน์รวมและ OT
    const sum = countDutySum(name);
    const ot = Math.max(0, sum - workdays);
    tableHtml += `<td class="sum-col">${sum}</td><td class="ot-col">${ot}</td>`;
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody>';
  // Summary rows (ลบแถว OT แนวนอนออก)
  let morningRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรเช้า</td>';
  let afternoonRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรบ่าย</td>';
  let nightRow = '<tr class="summary-row"><td class="summary-label sticky-col">สรุปเวรดึก</td>';
  for (let d = 1; d <= daysInMonth; d++) {
    let morning = 0, afternoon = 0, night = 0;
    for (const name of mainStaff) {
      const dutyObj = dutyData[getDutyKey(name, d)];
      const duty = typeof dutyObj === 'object' ? dutyObj.code : dutyObj || '';
      if (duty === 'ช' || duty === 'ชบ') morning++;
      if (duty === 'บ' || duty === 'ชบ' || duty === 'ดบ' || duty === 'MBบ') afternoon++;
      if (duty === 'ด' || duty === 'ดบ') night++;
    }
    morningRow += `<td>${morning}</td>`;
    afternoonRow += `<td>${afternoon}</td>`;
    nightRow += `<td>${night}</td>`;
  }
  morningRow += '<td></td><td></td></tr>';
  afternoonRow += '<td></td><td></td></tr>';
  nightRow += '<td></td><td></td></tr>';
  tableHtml += `<tfoot>${morningRow}${afternoonRow}${nightRow}</tfoot>`;
  tableHtml += '</table>';
  // Modal
  const modal = document.getElementById('overview-modal');
  modal.innerHTML = `
    <div style="font-size:1.2rem;font-weight:700;color:#1976d2;text-align:center;margin-bottom:1rem;">ภาพรวมตารางเวร</div>
    <div style="margin-bottom:1rem;font-size:1.05rem;color:#1976d2;">เดือนนี้มีวันทำการ <b>${workdays}</b> วัน</div>
    <div>${tableHtml}</div>
    <button class="close-btn" type="button">&times;</button>
  `;
  modal.classList.remove('hidden');
  // ปิด modal
  const closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
}

function applyLeave() {
  const modal = document.getElementById('leave-modal');
  const name = modal.querySelector('#leave-staff').value;
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  let days = [];
  const type = modal.querySelector('input[name="leave-type"]:checked').value;
  if (type === 'weekly') {
    // ทุกสัปดาห์: หาวันที่ตรงกับวันในสัปดาห์ที่เลือก
    const checked = modal.querySelectorAll('#weekly-checkboxes input[type="checkbox"]:checked');
    checked.forEach(chk => {
      const weekday = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'].indexOf(chk.value);
      const totalDays = getDaysInMonth(month, year);
      for (let i = 1; i <= totalDays; i++) {
        const d = new Date(year, month, i);
        // JS: 0=อาทิตย์, 1=จันทร์ ...
        if (d.getDay() === (weekday === 6 ? 0 : weekday + 1)) days.push(i);
      }
    });
  } else {
    // กำหนดเอง: ใช้ flatpickr multi-date
    const fp = document.querySelector('#multi-date')._flatpickr;
    if (fp && fp.selectedDates) {
      fp.selectedDates.forEach(date => {
        if (date.getMonth() === month && date.getFullYear() === year) {
          days.push(date.getDate());
        }
      });
    }
  }
  // เติม O ใน dutyData
  days.forEach(day => {
    dutyData[`${name}__${day}`] = 'O';
  });
  saveDutyData();
  modal.classList.add('hidden');
  renderTable();
}

function openParttimeModal() {
  const modal = document.getElementById('parttime-modal');
  modal.classList.remove('hidden');
  // เติมรายชื่อ Parttime
  const parttimeList = [
    "ดวงพร", "กาญจนา", "สาริสา", "รุ้งจินดา"
  ];
  const select = modal.querySelector('#parttime-staff');
  if (select) {
    select.innerHTML = '';
    parttimeList.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }
  // initialize flatpickr ทุกครั้งที่เปิด modal
  if (window.flatpickr) {
    flatpickr("#parttime-multi-date", {
      mode: "multiple",
      dateFormat: "Y-m-d",
      locale: "th"
    });
  }
  // ล้างวันที่เมื่อเปลี่ยนชื่อ parttime
  const staffSelect = modal.querySelector('#parttime-staff');
  if (staffSelect) {
    staffSelect.onchange = function() {
      const fp = document.querySelector('#parttime-multi-date')._flatpickr;
      if (fp) fp.clear();
    };
  }
  // ผูก event ให้ปุ่มบันทึกและกากบาททุกครั้ง
  const saveBtn = modal.querySelector('#parttime-save-btn');
  if (saveBtn) saveBtn.onclick = applyParttimeDuty;
  const closeBtn = modal.querySelector('.close-btn');
  if (closeBtn) closeBtn.onclick = closeParttimeModal;
}

function closeParttimeModal() {
  document.getElementById('parttime-modal').classList.add('hidden');
}

function applyParttimeDuty() {
  const modal = document.getElementById('parttime-modal');
  const name = modal.querySelector('#parttime-staff').value;
  const code = modal.querySelector('#parttime-duty').value;
  const year = Number(document.getElementById('year-select').value);
  const month = Number(document.getElementById('month-select').value);
  let days = [];
  const fp = document.querySelector('#parttime-multi-date')._flatpickr;
  if (fp && fp.selectedDates) {
    fp.selectedDates.forEach(date => {
      if (date.getMonth() === month && date.getFullYear() === year) {
        days.push(date.getDate());
      }
    });
  }
  // ใส่เวร Parttime
  days.forEach(day => {
    dutyData[`${name}__${day}`] = { code, manual: true };
  });
  saveDutyData();
  modal.classList.add('hidden');
  renderTable();
} 