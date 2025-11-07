import { useState, useEffect, type SetStateAction, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from 'react';
import { Upload, Search, CheckCircle, Trophy, Download, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import './App.css'

export default function RaceTracker() {
  const [runners, setRunners] = useState<any[]>([]);
  const [teams, setTeams] = useState<{[key: string]: any}>({});
  const [bibSearch, setBibSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [finishedTeams, setFinishedTeams] = useState<any[]>([]);
  const [view, setView] = useState('search'); // 'search' or 'results'
  const [lastFPress, setLastFPress] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishModalTeam, setFinishModalTeam] = useState<any>(null);
  const [editableFinishTime, setEditableFinishTime] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTeam, setEditModalTeam] = useState<any>(null);
  const [activeDistanceTab, setActiveDistanceTab] = useState('all');

  useEffect(() => {
    loadFromStorage();

    // Add double-tap F hotkey for finish
    const handleKeyPress = (e: { key: string; preventDefault: () => void; }) => {
      if (e.key === 'f' || e.key === 'F') {
        const now = Date.now();
        if (now - lastFPress < 500) { // 500ms window for double tap
          e.preventDefault();
          if (selectedTeam) {
            registerFinish();
          }
          setLastFPress(0); // Reset after double tap
        } else {
          setLastFPress(now);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedTeam, finishedTeams, lastFPress]);

  const loadFromStorage = () => {
    try {
      const runnersData = localStorage.getItem('runners');
      const teamsData = localStorage.getItem('teams');
      const finishedData = localStorage.getItem('finished');
      
      if (runnersData) setRunners(JSON.parse(runnersData));
      if (teamsData) setTeams(JSON.parse(teamsData));
      if (finishedData) setFinishedTeams(JSON.parse(finishedData));
    } catch (error) {
      console.log('No stored data found');
    }
  };

  const saveToStorage = (runnersData: any[], teamsData: {}, finishedData: any[]) => {
    try {
      localStorage.setItem('runners', JSON.stringify(runnersData));
      localStorage.setItem('teams', JSON.stringify(teamsData));
      localStorage.setItem('finished', JSON.stringify(finishedData));
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target) return;
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      processStartList(data);
    };
    reader.readAsBinaryString(file);
  };

  const processStartList = (data: any[]) => {
    const processedRunners: any[] | ((prevState: never[]) => never[]) = [];
    const teamMap: { [key: string]: any } = {};
    const teamBibMap: { [key: string]: number } = {}; // Map team names to bib numbers
    let bibCounter = 1;

    // First pass: create teams and assign bib numbers
    data.forEach((row) => {
      const teamName = row['Team name'] || 'Individual';
      
      // Assign bib number to team if not already assigned
      if (!teamBibMap[teamName]) {
        teamBibMap[teamName] = row['Bib'];
      }
    });

    // Second pass: process runners with team bib numbers
    data.forEach((row) => {
      const teamName = row['Team name'] || 'Individual';
      const rawDistance = row['Distance'] || '';
      // Clean distance: remove everything in parentheses and trim
      const cleanDistance = rawDistance.replace(/\s*\(.*?\)\s*/g, '').trim();
      
      const runner = {
        bib: teamBibMap[teamName], // Use team bib number
        firstName: row['First Name'] || '',
        lastName: row['Last Name'] || row['last name'] || '',
        email: row['Email'] || '',
        gender: row['Gender'] || '',
        phone: row['Phone number'] || '',
        country: row['Country of Residence'] || '',
        ioc: row['IOC'] || '',
        nationality: row['Nationality'] || '',
        city: row['City'] || '',
        address: row['Address'] || '',
        postcode: row['Postcode'] || '',
        club: row['Club'] || '',
        birthday: row['Birthday'] || '',
        teamName: teamName,
        status: row['Status'] || '',
        raceName: row['Race Name'] || '',
        distance: cleanDistance
      };

      processedRunners.push(runner);

      if (!teamMap[teamName]) {
        teamMap[teamName] = {
          teamName: teamName,
          bib: teamBibMap[teamName], // Use team bib number
          runners: [],
          country: runner.country,
          city: runner.city,
          club: runner.club,
          distance: cleanDistance
        };
      }
      teamMap[teamName].runners.push(runner);
    });

    setRunners(processedRunners);
    setTeams(teamMap);
    saveToStorage(processedRunners, teamMap, finishedTeams);
  };

  const searchByBib = () => {
    const bib = parseInt(bibSearch);
    // Find the team that has this bib number
    const team = Object.values(teams).find(team => team.bib === bib);
    
    if (team) {
      setSelectedTeam(team);
    } else {
      setSelectedTeam(null);
      alert('Bib number not found');
    }
    setBibSearch(''); // Reset input field
  };

  const registerFinish = () => {
    if (!selectedTeam) return;

    const finishTime = new Date().toLocaleTimeString('en-GB');
    const alreadyFinished = finishedTeams.find(t => t.teamName === selectedTeam.teamName);
    
    if (alreadyFinished) {
      alert('This team has already finished!');
      return;
    }

    const newFinish = {
      ...selectedTeam,
      finishTime: finishTime,
      finishOrder: finishedTeams.length + 1,
      distance: selectedTeam.distance
    };

    const updatedFinished = [...finishedTeams, newFinish];
    setFinishedTeams(updatedFinished);
    saveToStorage(runners, teams, updatedFinished);
    
    //alert(`Finish registered! Time: ${finishTime}`);
    setSelectedTeam(null);
  };

  const openFinishModal = (team: SetStateAction<null>) => {
    setFinishModalTeam(team);
    setEditableFinishTime(new Date().toLocaleTimeString('en-GB'));
    setShowFinishModal(true);
  };

  const confirmManualFinish = () => {
    if (!finishModalTeam || !editableFinishTime) return;

    const alreadyFinished = finishedTeams.find(t => t.teamName === finishModalTeam.teamName);
    
    if (alreadyFinished) {
      alert('This team has already finished!');
      setShowFinishModal(false);
      return;
    }

    const newFinish = {
      ...finishModalTeam,
      finishTime: editableFinishTime,
      finishOrder: finishedTeams.length + 1,
      distance: finishModalTeam.distance
    };

    const updatedFinished = [...finishedTeams, newFinish];
    setFinishedTeams(updatedFinished);
    saveToStorage(runners, teams, updatedFinished);
    
    setShowFinishModal(false);
    setFinishModalTeam(null);
    setEditableFinishTime('');
  };

  const openEditModal = (team: { finishTime: SetStateAction<string>; }) => {
    setEditModalTeam(team);
    setEditableFinishTime(team.finishTime);
    setShowEditModal(true);
  };

  const confirmEditFinish = () => {
    if (!editModalTeam || !editableFinishTime) return;

    const updatedFinished = finishedTeams.map(team => 
      team.teamName === editModalTeam.teamName 
        ? { ...team, finishTime: editableFinishTime }
        : team
    );

    setFinishedTeams(updatedFinished);
    saveToStorage(runners, teams, updatedFinished);
    
    setShowEditModal(false);
    setEditModalTeam(null);
    setEditableFinishTime('');
  };

  const exportResults = () => {
    // Create a map of team names to their finish data
    const finishMap: {[key: string]: {placement: number, finishTime: string}} = {};
    finishedTeams.forEach((team, idx) => {
      finishMap[team.teamName] = {
        placement: idx + 1,
        finishTime: team.finishTime
      };
    });

    // Add placement and finish time to each runner
    const exportData = runners.map(runner => {
      const finishData = finishMap[runner.teamName];
      return {
        'Race Name': runner.raceName,
        'Distance Name': runner.distance,
        'Email': runner.email,
        'First Name': runner.firstName,
        'Last Name': runner.lastName,
        'Gender': runner.gender,
        'Phone number': runner.phone,
        'Country of Residence': runner.country,
        'IOC': runner.ioc,
        'Nationality': runner.nationality,
        'City': runner.city,
        'Address': runner.address,
        'Postcode': runner.postcode,
        'Club': runner.club,
        'Birthday': runner.birthday,
        'Team name': runner.teamName,
        'Status': runner.status,
        'Placement': finishData ? finishData.placement : '',
        'Finish Time': finishData ? finishData.finishTime : ''
      };
    });

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `race_results_${date}.xlsx`);
  };

  const resetApplication = () => {
    if (resetConfirmText !== 'delete') {
      alert('Please type "delete" to confirm');
      return;
    }

    try {
      localStorage.removeItem('runners');
      localStorage.removeItem('teams');
      localStorage.removeItem('finished');
      
      setRunners([]);
      setTeams({});
      setFinishedTeams([]);
      setSelectedTeam(null);
      setBibSearch('');
      setShowResetModal(false);
      setResetConfirmText('');
      
      //alert('Application reset successfully!');
    } catch (error) {
      console.error('Failed to reset:', error);
      alert('Failed to reset application');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-indigo-900 mb-2">KTR Team Tracker</h2>
              <p className="text-gray-600 hidden sm:block">Track teams and log finish times</p>
            </div>
            {runners.length > 0 && (
              <div className="flex gap-2">
                <label className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden md:inline">Update Start List</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden md:inline">Reset App</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {runners.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Upload className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-4">Upload Start List</h2>
            <p className="text-gray-600 mb-6">Upload your Excel file from raceId to get started</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block mx-auto"
            />
          </div>
        ) : (
          <>
            <div className="flex gap-2 sm:gap-4 mb-6">
              <button
                onClick={() => setView('search')}
                className={`flex-1 py-3 px-3 sm:px-6 rounded-lg font-semibold transition ${
                  view === 'search'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Search className="inline w-5 h-5" />
                <span className="hidden md:inline ml-2">Search</span>
              </button>
              <button
                onClick={() => setView('results')}
                className={`flex-1 py-3 px-3 sm:px-6 rounded-lg font-semibold transition ${
                  view === 'results'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Trophy className="inline w-5 h-5" />
                <span className="hidden md:inline ml-2">Results</span>
                <span className="md:hidden ml-1">({finishedTeams.length})</span>
                <span className="hidden md:inline"> ({finishedTeams.length})</span>
              </button>
            </div>

            {view === 'search' ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Enter Team Bib Number</h2>
                  <p className="text-sm text-gray-600 mb-3">Search by team bib number • Double-tap F to register finish after search</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={bibSearch}
                      onChange={(e) => setBibSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchByBib()}
                      placeholder="Team Bib..."
                      className="flex-1 min-w-0 px-3 py-2 text-xl sm:text-2xl sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={searchByBib}
                      className="px-4 py-2 sm:px-8 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold whitespace-nowrap"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {selectedTeam && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-indigo-900">{selectedTeam.teamName}</h2>
                        <p className="text-gray-600">Bib #{selectedTeam.bib} • {selectedTeam.distance}</p>
                        {finishedTeams.find(t => t.teamName === selectedTeam.teamName) && (
                          <p className="text-green-600 font-semibold mt-1">
                            ✓ Finished at {finishedTeams.find(t => t.teamName === selectedTeam.teamName).finishTime}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={registerFinish}
                        disabled={finishedTeams.find(t => t.teamName === selectedTeam.teamName)}
                        className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                          finishedTeams.find(t => t.teamName === selectedTeam.teamName)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                        Register Finish
                      </button>
                    </div>

                    <div className="mb-4 text-gray-700">
                      <p><strong>Origin:</strong> {selectedTeam.city}{selectedTeam.country ? `, ${selectedTeam.country}` : ''}</p>
                      {selectedTeam.club && <p><strong>Club:</strong> {selectedTeam.club}</p>}
                    </div>

                    <h3 className="font-semibold text-lg mb-2">Team Members:</h3>
                    <div className="space-y-2">
                      {selectedTeam.runners.map((runner: { firstName: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; lastName: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; gender: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; nationality: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, idx: Key | null | undefined) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <p className="font-semibold">{runner.firstName} {runner.lastName}</p>
                          <p className="text-sm text-gray-600">{runner.gender}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Finished Teams</h2>
                    {finishedTeams.length > 0 && (
                      <button
                        onClick={exportResults}
                        className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">Export Results</span>
                      </button>
                    )}
                  </div>
                  
                  {finishedTeams.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No teams have finished yet</p>
                  ) : (
                    <>
                      {/* Distance Tabs */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <button
                          onClick={() => setActiveDistanceTab('all')}
                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                            activeDistanceTab === 'all'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          All ({finishedTeams.length})
                        </button>
                        {[...new Set(finishedTeams.map(t => t.distance))].sort().map(distance => (
                          <button
                            key={distance}
                            onClick={() => setActiveDistanceTab(distance)}
                            className={`px-4 py-2 rounded-lg font-semibold transition ${
                              activeDistanceTab === distance
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {distance} ({finishedTeams.filter(t => t.distance === distance).length})
                          </button>
                        ))}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left">Place</th>
                              <th className="px-4 py-3 text-left">Bib</th>
                              <th className="px-4 py-3 text-left">Team Name</th>
                              <th className="px-4 py-3 text-left">Distance</th>
                              <th className="px-4 py-3 text-left">Origin</th>
                              <th className="px-4 py-3 text-left">Finish Time</th>
                              <th className="px-4 py-3 text-right"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {finishedTeams
                              .filter(team => activeDistanceTab === 'all' || team.distance === activeDistanceTab)
                              .sort((a, b) => {
                                const timeA = a.finishTime.split(':').map(Number);
                                const timeB = b.finishTime.split(':').map(Number);
                                for (let i = 0; i < 3; i++) {
                                  if (timeA[i] !== timeB[i]) {
                                    return timeA[i] - timeB[i];
                                  }
                                }
                                return 0;
                              })
                              .map((team, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 font-bold text-lg">{idx + 1}</td>
                                  <td className="px-4 py-3 text-gray-600">#{team.bib}</td>
                                  <td className="px-4 py-3 font-semibold">{team.teamName}</td>
                                  <td className="px-4 py-3 text-gray-600">{team.distance}</td>
                                  <td className="px-4 py-3">{team.city}, {team.country}</td>
                                  <td className="px-4 py-3 font-mono">{team.finishTime}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => openEditModal(team)}
                                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                    >
                                      Edit
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {Object.keys(teams).length > finishedTeams.length && (
                  <div className="bg-gray-50 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Still Racing</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-300">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm text-gray-600">Bib</th>
                            <th className="px-3 py-2 text-left text-sm text-gray-600">Team Name</th>
                            <th className="px-3 py-2 text-left text-sm text-gray-600">Distance</th>
                            <th className="px-3 py-2 text-left text-sm text-gray-600">Origin</th>
                            <th className="px-3 py-2 text-right text-sm text-gray-600"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(teams)
                            .filter(team => !finishedTeams.find(f => f.teamName === team.teamName))
                            .map((team, idx) => (
                              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-100">
                                <td className="px-3 py-2 text-sm text-gray-500">#{team.bib}</td>
                                <td className="px-3 py-2 text-sm text-gray-700">{team.teamName}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">{team.distance}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">{team.city}, {team.country}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => openFinishModal(team)}
                                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                  >
                                    Finish
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-bold text-gray-900">Reset Application?</h2>
              </div>
              <p className="text-gray-600 mb-4">
                This will permanently delete all data including the start list, team information, and all finish times. This action cannot be undone.
              </p>
              <p className="text-gray-900 font-semibold mb-2">
                Type "delete" to confirm:
              </p>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type delete here"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmText('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={resetApplication}
                  disabled={resetConfirmText !== 'delete'}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
                    resetConfirmText === 'delete'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Delete Everything
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Finish Time Modal */}
        {showFinishModal && finishModalTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Register Finish</h2>
              <p className="text-gray-600 mb-4">
                Team: <strong>{finishModalTeam.teamName}</strong> (Bib #{finishModalTeam.bib})
              </p>
              <p className="text-gray-900 font-semibold mb-2">
                Finish Time:
              </p>
              <input
                type="text"
                value={editableFinishTime}
                onChange={(e) => setEditableFinishTime(e.target.value)}
                placeholder="HH:MM:SS"
                className="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-4 font-mono"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    setFinishModalTeam(null);
                    setEditableFinishTime('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmManualFinish}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Confirm Finish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Finish Time Modal */}
        {showEditModal && editModalTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Finish Time</h2>
              <p className="text-gray-600 mb-4">
                Team: <strong>{editModalTeam.teamName}</strong> (Bib #{editModalTeam.bib})
              </p>
              <p className="text-gray-900 font-semibold mb-2">
                Finish Time:
              </p>
              <input
                type="text"
                value={editableFinishTime}
                onChange={(e) => setEditableFinishTime(e.target.value)}
                placeholder="HH:MM:SS"
                className="w-full px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-4 font-mono"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditModalTeam(null);
                    setEditableFinishTime('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEditFinish}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Update Time
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}