import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { formatPercentFp } from '../../core/math';
import { PresetConfig, PresetId, TokenInfo } from '../../core/types';
import { ActionButton } from '../common/ActionButton';

interface HeaderBarProps {
  presets: PresetConfig[];
  selectedPreset: PresetId;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  feeRate: bigint;
  onPresetChange: (preset: PresetId) => void;
  onReset: () => void;
  onExport: () => string;
  onImport: (raw: string) => { ok: boolean; error?: string };
  onUpdateTokenMeta: (tokenX: TokenInfo, tokenY: TokenInfo) => void;
  onUpdateFeeRate: (feeRateInput: string) => void;
}

export function HeaderBar({
  presets,
  selectedPreset,
  tokenX,
  tokenY,
  feeRate,
  onPresetChange,
  onReset,
  onExport,
  onImport,
  onUpdateTokenMeta,
  onUpdateFeeRate
}: HeaderBarProps) {
  const [tokenXSymbol, setTokenXSymbol] = useState(tokenX.symbol);
  const [tokenYSymbol, setTokenYSymbol] = useState(tokenY.symbol);
  const [tokenXDecimals, setTokenXDecimals] = useState(tokenX.decimals.toString());
  const [tokenYDecimals, setTokenYDecimals] = useState(tokenY.decimals.toString());
  const [feeInput, setFeeInput] = useState(formatPercentFp(feeRate, 4));
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTokenXSymbol(tokenX.symbol);
    setTokenYSymbol(tokenY.symbol);
    setTokenXDecimals(tokenX.decimals.toString());
    setTokenYDecimals(tokenY.decimals.toString());
    setFeeInput(formatPercentFp(feeRate, 4));
  }, [feeRate, tokenX, tokenY]);

  const currentPresetLabel = useMemo(
    () => presets.find((preset) => preset.id === selectedPreset)?.label ?? selectedPreset,
    [presets, selectedPreset]
  );

  const handleExport = () => {
    const payload = onExport();
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `amm-state-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('状态已导出为 JSON 文件');
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const raw = await file.text();
    const result = onImport(raw);
    if (result.ok) {
      setMessage('状态导入成功');
    } else {
      setMessage(result.error ?? '状态导入失败');
    }
    event.target.value = '';
  };

  const handleTokenUpdate = () => {
    onUpdateTokenMeta(
      { symbol: tokenXSymbol, decimals: Number(tokenXDecimals) },
      { symbol: tokenYSymbol, decimals: Number(tokenYDecimals) }
    );
    setMessage('Token 元数据已更新');
  };

  const handleFeeUpdate = () => {
    const normalized = (Number(feeInput) / 100).toString();
    onUpdateFeeRate(normalized);
    setMessage('Fee rate 已更新');
  };

  return (
    <header className="topbar">
      <div className="brand">
        <h1>AMM Lab</h1>
        <p>Uniswap v2 / Constant Product Sandbox</p>
      </div>

      <div className="topbar-controls">
        <label>
          <span>Preset</span>
          <select
            value={selectedPreset}
            onChange={(event) => onPresetChange(event.target.value as PresetId)}
            aria-label="Select preset"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <ActionButton variant="secondary" onClick={onReset}>
          Reset ({currentPresetLabel})
        </ActionButton>
        <ActionButton variant="secondary" onClick={handleExport}>
          Export
        </ActionButton>
        <ActionButton variant="secondary" onClick={handleImportClick}>
          Import
        </ActionButton>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleImportChange} hidden />
      </div>

      <div className="meta-row">
        <label>
          <span>Token X</span>
          <input value={tokenXSymbol} onChange={(event) => setTokenXSymbol(event.target.value)} />
        </label>
        <label>
          <span>X Decimals</span>
          <input
            type="number"
            min="0"
            max="36"
            value={tokenXDecimals}
            onChange={(event) => setTokenXDecimals(event.target.value)}
          />
        </label>
        <label>
          <span>Token Y</span>
          <input value={tokenYSymbol} onChange={(event) => setTokenYSymbol(event.target.value)} />
        </label>
        <label>
          <span>Y Decimals</span>
          <input
            type="number"
            min="0"
            max="36"
            value={tokenYDecimals}
            onChange={(event) => setTokenYDecimals(event.target.value)}
          />
        </label>
        <ActionButton variant="ghost" onClick={handleTokenUpdate}>
          Apply Token Meta
        </ActionButton>
      </div>

      <div className="meta-row">
        <label>
          <span>Fee Rate (%)</span>
          <input type="number" min="0" max="99" step="0.0001" value={feeInput} onChange={(event) => setFeeInput(event.target.value)} />
        </label>
        <ActionButton variant="ghost" onClick={handleFeeUpdate}>
          Apply Fee
        </ActionButton>
      </div>

      {message ? <p className="topbar-message">{message}</p> : null}
    </header>
  );
}
