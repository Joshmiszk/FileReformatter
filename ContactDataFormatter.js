import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default function ContactDataFormatter() {
  const [file, setFile] = useState(null);
  const [processedData, setProcessedData] = useState(null);

  const validStages = ["Active Lead", "Business Partner Only", "Prospect", "Client"];

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
  };

  const aiEnhanceData = async (data) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant that formats and corrects contact data for a CRM." },
          { role: "user", content: `Format and clean the following contact data: ${JSON.stringify(data)}` }
        ]
      });
      console.log("OpenAI API Response:", response);
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return data; // Return original data if AI fails
    }
  };

  const processFile = async () => {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      let jsonData = XLSX.utils.sheet_to_json(sheet);

      const formattedData = jsonData.map((row) => {
        let [FirstName, LastName] = row["Full Name"]?.split(" ") || ["", ""];
        let DateOfBirth = row["Date"] ? new Date(row["Date"]).toISOString().split("T")[0] : "";
        let BorrowerStageName = validStages.includes(row["BorrowerStage.Name"]) ? row["BorrowerStage.Name"] : "Prospect";
        let PartnerTypeName = row["PartnerType.Name"] || "";
        let LeadSource = row["LeadSource"] || "";
        let Campaign = row["Campaign"] || "";

        return {
          "FirstName": FirstName,
          "LastName": LastName,
          "Email": row["Email"] || "",
          "Phone": row["Phone"] || "",
          "Address": row["Address"] || "",
          "City": row["City"] || "",
          "Province": row["Province"] || "",
          "PostalCode": row["Postal Code"] || "",
          "DateOfBirth": DateOfBirth,
          "BorrowerStage.Name": BorrowerStageName,
          "PartnerType.Name": PartnerTypeName,
          "LeadSource": LeadSource,
          "Campaign": Campaign,
        };
      });

      const enhancedData = await aiEnhanceData(formattedData);
      setProcessedData(enhancedData);
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadCSV = () => {
    if (!processedData) return;
    const worksheet = XLSX.utils.json_to_sheet(processedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Formatted Data");
    XLSX.writeFile(workbook, "formatted_contacts.csv");
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} />
        <Button onClick={processFile} disabled={!file}>Process File</Button>
        {processedData && <Button onClick={downloadCSV}>Download CSV</Button>}
      </CardContent>
    </Card>
  );
}
