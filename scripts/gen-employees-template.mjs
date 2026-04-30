import ExcelJS from "exceljs";
import path from "path";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("직원");

ws.columns = [
  { header: "사번", key: "employee_no", width: 12 },
  { header: "이름", key: "name", width: 12 },
  { header: "부서", key: "department", width: 14 },
  { header: "직급", key: "position", width: 12 },
  { header: "입사일", key: "hire_date", width: 14 },
  { header: "기본급", key: "base_salary", width: 14 },
  { header: "부양가족", key: "dependents", width: 10 },
  { header: "생년월일", key: "birth_date", width: 14 },
  { header: "전화", key: "phone", width: 16 },
  { header: "이메일", key: "email", width: 22 },
  { header: "은행", key: "bank_name", width: 12 },
  { header: "계좌", key: "bank_account", width: 22 },
];

ws.addRow({
  employee_no: "DEV-3007",
  name: "홍길동",
  department: "개발",
  position: "대리",
  hire_date: "2024-03-04",
  base_salary: 3500000,
  dependents: 2,
  birth_date: "1992-07-15",
  phone: "010-0000-0000",
  email: "hong@example.com",
  bank_name: "국민",
  bank_account: "123-45-6789012",
});

ws.getRow(1).font = { bold: true };
ws.getRow(1).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE0E7FF" },
};

const out = path.resolve(process.cwd(), "public/templates/employees-template.xlsx");
await wb.xlsx.writeFile(out);
console.log("Wrote", out);
