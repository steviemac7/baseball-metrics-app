import { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const BulkUserImportModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [parsedUsers, setParsedUsers] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [logs, setLogs] = useState([]);
    const [step, setStep] = useState('upload'); // upload, preview, importing, result

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            parseCSV(selectedFile);
        } else {
            alert('Please select a valid .csv file');
        }
    };

    const parseCSV = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

            const users = [];
            for (let i = 1; i < lines.length; i++) {
                const currentLine = lines[i].trim();
                if (!currentLine) continue;

                // Handle basic CSV parsing (ignoring commas inside quotes for now for simplicity, 
                // assuming simple data structure as per requirements)
                const values = currentLine.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

                if (values.length < headers.length) continue; // Skip incomplete lines

                const user = {};
                headers.forEach((header, index) => {
                    // Map common CSV headers to our internal field names
                    let key = header;
                    if (header === 'firstname' || header === 'first name') key = 'name'; // Fallback if they split names, but let's assume 'name' is full name
                    if (header === 'date of birth') key = 'dob';
                    if (header === 'height(ft)') key = 'heightFt';
                    if (header === 'height(in)') key = 'heightIn';

                    user[key] = values[index];
                });

                // Basic validation/transform
                if (user.email && user.name) {
                    users.push({
                        name: user.name,
                        email: user.email,
                        team: user.team || '',
                        dob: user.dob || '',
                        gender: user.gender || 'Male',
                        heightFt: parseInt(user.heightFt) || 0,
                        heightIn: parseInt(user.heightIn) || 0,
                        weight: parseInt(user.weight) || 0
                    });
                }
            }
            setParsedUsers(users);
            setStep('preview');
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        setStep('importing');
        setIsImporting(true);
        const newLogs = [];
        let successCount = 0;

        for (const user of parsedUsers) {
            try {
                await onImport(user);
                newLogs.push({ status: 'success', message: `Created ${user.name} (${user.email})` });
                successCount++;
            } catch (err) {
                newLogs.push({ status: 'error', message: `Failed ${user.name}: ${err.message}` });
            }
            // Update logs in real-time? React state might batch, but good enough
            setLogs([...newLogs]);
        }

        setIsImporting(false);
        setStep('result');
    };

    const reset = () => {
        setFile(null);
        setParsedUsers([]);
        setLogs([]);
        setStep('upload');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 shrink-0">
                    <h3 className="text-xl font-semibold text-white">Import Athletes via CSV</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-xl p-8 hover:bg-gray-700/30 transition-colors">
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <p className="text-gray-300 mb-2">Click or drag CSV file here</p>
                            <p className="text-gray-500 text-sm mb-6">Format: name, email, team, dob, gender, heightFt, heightIn, weight</p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-600 file:text-white
                                hover:file:bg-blue-700
                                "
                            />
                        </div>
                    )}

                    {step === 'preview' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <FileText className="text-blue-400" />
                                    <span className="text-white font-medium">{file.name}</span>
                                </div>
                                <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                                    {parsedUsers.length} Athletes found
                                </span>
                            </div>

                            <div className="max-h-60 overflow-y-auto bg-gray-900 rounded-lg p-2 mb-4 border border-gray-700">
                                <table className="w-full text-left text-xs text-gray-400">
                                    <thead className="text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-900">
                                        <tr>
                                            <th className="p-2">Name</th>
                                            <th className="p-2">Email</th>
                                            <th className="p-2">Team</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedUsers.slice(0, 50).map((u, i) => (
                                            <tr key={i} className="border-b border-gray-800 last:border-0">
                                                <td className="p-2 text-white">{u.name}</td>
                                                <td className="p-2">{u.email}</td>
                                                <td className="p-2">{u.team}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedUsers.length > 50 && (
                                    <p className="text-center text-gray-600 p-2">...and {parsedUsers.length - 50} more</p>
                                )}
                            </div>

                            <div className="text-yellow-400 text-sm bg-yellow-400/10 p-3 rounded mb-4">
                                <AlertCircle className="w-4 h-4 inline mr-2" />
                                New accounts will be created with temporary password: <strong>password123</strong>
                            </div>

                            <button
                                onClick={handleImport}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                Import {parsedUsers.length} Users
                            </button>
                            <button onClick={reset} className="w-full mt-2 py-2 text-gray-400 hover:text-white">Cancel</button>
                        </div>
                    )}

                    {(step === 'importing' || step === 'result') && (
                        <div>
                            {step === 'importing' && (
                                <div className="flex items-center justify-center mb-6 text-blue-400">
                                    <Loader className="w-8 h-8 animate-spin mr-3" />
                                    <span className="text-lg">Importing...</span>
                                </div>
                            )}

                            <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto border border-gray-700 font-mono text-xs">
                                {logs.map((log, i) => (
                                    <div key={i} className={`mb-1 ${log.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {log.status === 'success' ? '✓' : '✖'} {log.message}
                                    </div>
                                ))}
                                {logs.length === 0 && <span className="text-gray-600">Starting import...</span>}
                            </div>

                            {step === 'result' && (
                                <button
                                    onClick={() => { onClose(); reset(); }}
                                    className="w-full mt-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkUserImportModal;
