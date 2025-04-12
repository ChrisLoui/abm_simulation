import React from 'react';

/**
 * Settings panel component for adjusting simulation parameters.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.settings - Current settings object.
 * @param {Function} props.handleSettingChange - Handler for setting changes.
 * @param {Function} props.applySettings - Handler for applying settings.
 */
const SettingsPanel = ({ settings, handleSettingChange, applySettings }) => {
    return (
        <div className="absolute top-16 right-4 bg-white p-4 rounded shadow-lg border border-gray-300 w-64">
            <h3 className="text-lg font-semibold mb-2">Simulation Settings</h3>

            <div className="mb-2">
                <label className="block text-sm font-medium">
                    Cars per Minute:
                    <input
                        type="range"
                        name="carsPerMinute"
                        min="10"
                        max="1000"
                        value={settings.carsPerMinute}
                        onChange={handleSettingChange}
                        className="w-full"
                    />
                    <span className="text-xs">{settings.carsPerMinute}</span>
                </label>
            </div>

            <div className="mb-2">
                <label className="block text-sm font-medium">
                    Number of Buses:
                    <input
                        type="range"
                        name="busCount"
                        min="2"
                        max="10"
                        value={settings.busCount}
                        onChange={handleSettingChange}
                        className="w-full"
                    />
                    <span className="text-xs">{settings.busCount}</span>
                </label>
            </div>

            <div className="mb-2">
                <label className="block text-sm font-medium">
                    Min Speed:
                    <input
                        type="range"
                        name="minSpeed"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.minSpeed}
                        onChange={handleSettingChange}
                        className="w-full"
                    />
                    <span className="text-xs">{settings.minSpeed.toFixed(1)}</span>
                </label>
            </div>

            <div className="mb-2">
                <label className="block text-sm font-medium">
                    Max Speed:
                    <input
                        type="range"
                        name="maxSpeed"
                        min="2"
                        max="5"
                        step="0.1"
                        value={settings.maxSpeed}
                        onChange={handleSettingChange}
                        className="w-full"
                    />
                    <span className="text-xs">{settings.maxSpeed.toFixed(1)}</span>
                </label>
            </div>

            <button
                onClick={applySettings}
                className="w-full bg-blue-500 text-white py-1 rounded hover:bg-blue-600 transition-colors mt-2"
            >
                Apply Settings
            </button>

            <div className="mt-2 text-xs text-gray-500">
                <p>Each car has a random behavior type:</p>
                <ul className="list-disc ml-4">
                    <li><strong>Polite:</strong> Rarely changes lanes</li>
                    <li><strong>Neutral:</strong> Changes when necessary</li>
                    <li><strong>Aggressive:</strong> Frequently changes lanes</li>
                </ul>
            </div>
        </div>
    );
};

export default SettingsPanel;
