"use client";

import { useState, useRef } from "react";
import {
  Database,
  FileSpreadsheet,
  Upload,
  Check,
  AlertCircle,
  Download,
  RotateCcw,
  X,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  AVAILABLE_NASA_DATASETS,
  NASA_HERA_DATASET,
  getActiveAstronautDataset,
  saveActiveAstronautDataset,
  resetAstronautDataset,
  parseCsvTelemetry,
  generateSampleNasaCsv,
  type MissionDataset,
} from "@/lib/datasets/nasa-telemetry-datasets";
import type { CrewMember } from "./health-data";

interface DatasetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  astronaut: CrewMember;
  onDatasetChanged: () => void;
}

export function DatasetImportModal({
  isOpen,
  onClose,
  astronaut,
  onDatasetChanged,
}: DatasetImportModalProps) {
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    AVAILABLE_NASA_DATASETS[0].id,
  );
  const [isSuccessToast, setIsSuccessToast] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    fileName: string;
    rowsCount: number;
    sampleHr: number;
    sampleBp: string;
    sampleTemp: number;
    rawHistory: unknown;
    rawLive: unknown;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentDataset = getActiveAstronautDataset(astronaut.id);

  const showToast = (msg: string) => {
    setIsSuccessToast(msg);
    setTimeout(() => setIsSuccessToast(null), 3000);
  };

  const handleSelectPreset = (preset: MissionDataset) => {
    setSelectedPresetId(preset.id);
    const crewData = preset.crewData[astronaut.id] ?? preset.crewData["alex-morgan"];
    saveActiveAstronautDataset(astronaut.id, preset.title, crewData);
    onDatasetChanged();
    showToast(`Loaded ${preset.title} for ${astronaut.name}!`);
  };

  const handleFileUpload = (file: File) => {
    setFileError(null);
    setParsedPreview(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      if (file.name.endsWith(".json")) {
        try {
          const json = JSON.parse(text);
          if (Array.isArray(json) && json.length > 0) {
            // JSON format
            const hr = json[0].heartRate || json[0].heart_rate || 70;
            const sys = json[0].systolic || json[0].bp_sys || 118;
            const dia = json[0].diastolic || json[0].bp_dia || 76;
            const temp = json[0].skinTemperature || json[0].temp || 34.0;
            setParsedPreview({
              fileName: file.name,
              rowsCount: json.length,
              sampleHr: hr,
              sampleBp: `${sys}/${dia}`,
              sampleTemp: temp,
              rawHistory: json,
              rawLive: [],
            });
          } else {
            setFileError("JSON must contain an array of biometric observation objects.");
          }
        } catch {
          setFileError("Invalid JSON syntax. Please check file format.");
        }
      } else {
        // Parse CSV
        const parsed = parseCsvTelemetry(text);
        if (!parsed.success) {
          setFileError(parsed.error || "Failed to parse CSV.");
        } else {
          setParsedPreview({
            fileName: file.name,
            rowsCount: parsed.rowsParsed,
            sampleHr: parsed.history[0]?.restingHeartRate || 70,
            sampleBp: `${parsed.history[0]?.systolic || 118}/${parsed.history[0]?.diastolic || 76}`,
            sampleTemp: parsed.history[0]?.skinTemperature || 34.0,
            rawHistory: parsed.history,
            rawLive: parsed.liveCurve,
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleApplyCustomDataset = () => {
    if (!parsedPreview) return;
    const history = parsedPreview.rawHistory as ReturnType<typeof parseCsvTelemetry>["history"];
    const liveCurve = (parsedPreview.rawLive as ReturnType<typeof parseCsvTelemetry>["liveCurve"]) || [];

    saveActiveAstronautDataset(astronaut.id, `Imported: ${parsedPreview.fileName}`, {
      baselineHeartRate: parsedPreview.sampleHr,
      baselineBP: [118, 76],
      baselineTemp: parsedPreview.sampleTemp,
      liveTelemetryCurve: liveCurve.length > 0 ? liveCurve : NASA_HERA_DATASET.crewData["alex-morgan"].liveTelemetryCurve,
      history,
    });

    onDatasetChanged();
    showToast(`Dataset '${parsedPreview.fileName}' ingested & active!`);
    setTimeout(() => onClose(), 800);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleNasaCsv(astronaut.name);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `nasa-telemetry-${astronaut.id}-template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded NASA CSV template!");
  };

  const handleResetDefault = () => {
    resetAstronautDataset(astronaut.id);
    onDatasetChanged();
    showToast(`Reset ${astronaut.name} to default NASA baseline telemetry.`);
  };

  return (
    <div className="dataset-modal-backdrop" onClick={onClose}>
      <div className="dataset-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="dataset-modal-header">
          <div className="modal-title-row">
            <div className="dataset-icon-badge">
              <Database size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2>TELEMETRY DATASET INGESTION</h2>
              <p className="dataset-modal-sub">
                Astronaut: <strong>{astronaut.name}</strong> ({astronaut.role})
              </p>
            </div>
          </div>
          <button type="button" className="dataset-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Success Toast */}
        {isSuccessToast && (
          <div className="dataset-toast-banner">
            <Check size={16} />
            <span>{isSuccessToast}</span>
          </div>
        )}

        {/* Current Dataset Status Banner */}
        <div className="active-dataset-strip">
          <div className="active-strip-label">
            <span className="live-indicator-dot" />
            <span>ACTIVE TELEMETRY SOURCE:</span>
          </div>
          <strong className="active-strip-title">{currentDataset.datasetTitle}</strong>
          <span className="active-strip-stats">
            Baseline HR: {currentDataset.baselineHeartRate} bpm · History: {currentDataset.history.length} Mission Days
          </span>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="dataset-tabs-bar">
          <button
            type="button"
            className={`dataset-tab-btn ${activeTab === "preset" ? "active" : ""}`}
            onClick={() => setActiveTab("preset")}
          >
            <Layers size={15} />
            <span>NASA Spaceflight Datasets</span>
          </button>
          <button
            type="button"
            className={`dataset-tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={15} />
            <span>Import Custom Dataset (CSV / JSON)</span>
          </button>
        </div>

        {/* TAB 1: NASA Presets */}
        {activeTab === "preset" && (
          <div className="preset-datasets-grid">
            {AVAILABLE_NASA_DATASETS.map((dataset) => {
              const isSelected = selectedPresetId === dataset.id;
              return (
                <div
                  key={dataset.id}
                  className={`preset-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelectPreset(dataset)}
                >
                  <div className="preset-card-top">
                    <div className="preset-source-tag">
                      <Sparkles size={13} className="text-cyan-400" />
                      <span>{dataset.source}</span>
                    </div>
                    {isSelected && (
                      <span className="selected-chip">
                        <Check size={12} /> Active In Dashboard
                      </span>
                    )}
                  </div>

                  <h3 className="preset-title">{dataset.title}</h3>
                  <span className="preset-subtitle">{dataset.subtitle}</span>
                  <p className="preset-desc">{dataset.description}</p>

                  <div className="preset-meta-row">
                    <span className="meta-tag">
                      <Activity size={12} /> {dataset.sampleFrequency}
                    </span>
                    <span className="meta-tag">
                      <FileSpreadsheet size={12} /> 14-Day Longitudinal Records
                    </span>
                  </div>

                  <button
                    type="button"
                    className="load-preset-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPreset(dataset);
                    }}
                  >
                    {isSelected ? "Currently Active" : "Load Telemetry Dataset"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Custom File Upload */}
        {activeTab === "upload" && (
          <div className="upload-dataset-view">
            <div
              className="dropzone-box"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <FileSpreadsheet size={36} className="text-cyan-400 mb-2" />
              <h3>Drop your CSV or JSON Telemetry Dataset here</h3>
              <p>Supports columns: heart_rate, systolic, diastolic, skin_temp, motion, sleep</p>
              <button type="button" className="browse-files-btn">
                Browse Telemetry File
              </button>
            </div>

            {/* Error Message */}
            {fileError && (
              <div className="upload-error-box">
                <AlertCircle size={16} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Parsed Preview Card */}
            {parsedPreview && (
              <div className="dataset-preview-card">
                <div className="preview-top">
                  <div className="preview-file-info">
                    <FileText size={18} className="text-emerald-400" />
                    <div>
                      <strong>{parsedPreview.fileName}</strong>
                      <span>{parsedPreview.rowsCount} valid telemetry rows detected</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="apply-dataset-btn"
                    onClick={handleApplyCustomDataset}
                  >
                    <Check size={16} />
                    <span>Apply &amp; Activate Dataset</span>
                  </button>
                </div>

                <div className="preview-metrics-grid">
                  <div className="preview-metric">
                    <span className="p-label">Sample Resting HR</span>
                    <span className="p-value">{parsedPreview.sampleHr} bpm</span>
                  </div>
                  <div className="preview-metric">
                    <span className="p-label">Sample Blood Pressure</span>
                    <span className="p-value">{parsedPreview.sampleBp} mmHg</span>
                  </div>
                  <div className="preview-metric">
                    <span className="p-label">Sample Skin Temp</span>
                    <span className="p-value">{parsedPreview.sampleTemp} °C</span>
                  </div>
                </div>
              </div>
            )}

            {/* Download Template Strip */}
            <div className="template-download-strip">
              <div>
                <strong>Need a sample format?</strong>
                <p>Download the official NASA spaceflight telemetry CSV template with standard column headers.</p>
              </div>
              <button
                type="button"
                className="download-template-btn"
                onClick={handleDownloadTemplate}
              >
                <Download size={15} />
                <span>Download Sample CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="dataset-modal-footer">
          <button
            type="button"
            className="reset-default-btn"
            onClick={handleResetDefault}
            title="Reset astronaut to default NASA baseline"
          >
            <RotateCcw size={14} />
            <span>Reset to NASA Baseline</span>
          </button>
          <button type="button" className="modal-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
