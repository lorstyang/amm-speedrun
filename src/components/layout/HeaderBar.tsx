import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { formatPercentFp } from '../../core/math';
import { AmmModel, TokenInfo, V3FeeTier } from '../../core/types';
import { ActionButton } from '../common/ActionButton';

export interface HeaderPreset {
  id: string;
  label: string;
}

interface HeaderBarProps {
  model: AmmModel;
  onModelChange: (model: AmmModel) => void;
  presets: HeaderPreset[];
  selectedPreset: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  onPresetChange: (preset: string) => void;
  onReset: () => void;
  onExport: () => string;
  onImport: (raw: string) => { ok: boolean; error?: string };
  onUpdateTokenMeta: (tokenX: TokenInfo, tokenY: TokenInfo) => void;
  feeRate?: bigint;
  onUpdateFeeRate?: (feeRateInput: string) => void;
  feeTier?: V3FeeTier;
  onUpdateFeeTier?: (feeTier: V3FeeTier) => { ok: boolean; error?: string };
}

const FEE_TIER_OPTIONS: Array<{ value: V3FeeTier; label: string }> = [
  { value: 500, label: '0.05%' },
  { value: 3000, label: '0.30%' },
  { value: 10000, label: '1.00%' }
];

export function HeaderBar({
  model,
  onModelChange,
  presets,
  selectedPreset,
  tokenX,
  tokenY,
  onPresetChange,
  onReset,
  onExport,
  onImport,
  onUpdateTokenMeta,
  feeRate,
  onUpdateFeeRate,
  feeTier,
  onUpdateFeeTier
}: HeaderBarProps) {
  const [tokenXSymbol, setTokenXSymbol] = useState(tokenX.symbol);
  const [tokenYSymbol, setTokenYSymbol] = useState(tokenY.symbol);
  const [tokenXDecimals, setTokenXDecimals] = useState(tokenX.decimals.toString());
  const [tokenYDecimals, setTokenYDecimals] = useState(tokenY.decimals.toString());
  const [feeInput, setFeeInput] = useState(feeRate ? formatPercentFp(feeRate, 4) : '0.3000');
  const [feeTierInput, setFeeTierInput] = useState<V3FeeTier>(feeTier ?? 3000);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTokenXSymbol(tokenX.symbol);
    setTokenYSymbol(tokenY.symbol);
    setTokenXDecimals(tokenX.decimals.toString());
    setTokenYDecimals(tokenY.decimals.toString());
  }, [tokenX, tokenY]);

  useEffect(() => {
    if (model === 'v2' && feeRate !== undefined) {
      setFeeInput(formatPercentFp(feeRate, 4));
    }
  }, [feeRate, model]);

  useEffect(() => {
    if (model === 'v3' && feeTier !== undefined) {
      setFeeTierInput(feeTier);
    }
  }, [feeTier, model]);

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
    anchor.download = `amm-state-${model}-${Date.now()}.json`;
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
    if (!onUpdateFeeRate) {
      return;
    }
    const normalized = (Number(feeInput) / 100).toString();
    onUpdateFeeRate(normalized);
    setMessage('Fee rate 已更新');
  };

  const handleFeeTierUpdate = () => {
    if (!onUpdateFeeTier) {
      return;
    }
    const result = onUpdateFeeTier(feeTierInput);
    setMessage(result.ok ? 'Fee tier 已更新' : result.error ?? 'Fee tier 更新失败');
  };

  return (
    <header className="topbar">
      <div className="brand">
        <h1>AMM Lab</h1>
        <p>{model === 'v2' ? 'Uniswap v2 / Constant Product Sandbox' : 'Uniswap v3 / Concentrated Liquidity Sandbox'}</p>
      </div>

      <div className="topbar-controls">
        <label>
          <span>Model</span>
          <select value={model} onChange={(event) => onModelChange(event.target.value as AmmModel)} aria-label="Select model">
            <option value="v2">Uniswap v2</option>
            <option value="v3">Uniswap v3</option>
          </select>
        </label>

        <label>
          <span>Preset</span>
          <select value={selectedPreset} onChange={(event) => onPresetChange(event.target.value)} aria-label="Select preset">
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

      {model === 'v2' ? (
        <div className="meta-row">
          <label>
            <span>Fee Rate (%)</span>
            <input
              type="number"
              min="0"
              max="99"
              step="0.0001"
              value={feeInput}
              onChange={(event) => setFeeInput(event.target.value)}
            />
          </label>
          <ActionButton variant="ghost" onClick={handleFeeUpdate}>
            Apply Fee
          </ActionButton>
        </div>
      ) : (
        <div className="meta-row">
          <label>
            <span>Fee Tier</span>
            <select value={feeTierInput} onChange={(event) => setFeeTierInput(Number(event.target.value) as V3FeeTier)}>
              {FEE_TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ActionButton variant="ghost" onClick={handleFeeTierUpdate}>
            Apply Fee Tier
          </ActionButton>
        </div>
      )}

      {message ? <p className="topbar-message">{message}</p> : null}
    </header>
  );
}
