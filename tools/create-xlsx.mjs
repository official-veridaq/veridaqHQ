import ExcelJS from "exceljs";
import { writeFileSync } from "fs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Students");

ws.columns = [
  { header: "MatricNumber", key: "matric", width: 18 },
  { header: "Name", key: "name", width: 20 },
  { header: "CGPA", key: "cgpa", width: 10 },
  { header: "Classification", key: "classification", width: 22 },
  { header: "Course", key: "course", width: 25 },
  { header: "GraduationYear", key: "year", width: 15 },
];

ws.addRow({ matric: "FUT/19/001", name: "John Doe", cgpa: 4.52, classification: "First Class", course: "Computer Science", year: 2024 });
ws.addRow({ matric: "FUT/19/002", name: "Jane Smith", cgpa: 3.82, classification: "Upper Second Class", course: "Electrical Engineering", year: 2024 });
ws.addRow({ matric: "FUT/19/003", name: "Bob Johnson", cgpa: 3.15, classification: "Second Class Lower", course: "Mechanical Engineering", year: 2024 });

const buf = await wb.xlsx.writeBuffer();
writeFileSync("/tmp/demo_batch.xlsx", Buffer.from(buf));
console.log("XLSX created");
