import React, { useState } from 'react';
import { Plus, Minus, Share2, Info, DollarSign, Send, Calendar, Trash2, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#FF6B6B', '#9B59B6', '#3498DB', '#E74C3C'];

const INDIVIDUAL_AVATARS = [
  { id: 'man', icon: '👨' },
  { id: 'woman', icon: '👩' },
  { id: 'happy', icon: '😊' },
  { id: 'cool', icon: '😎' },
  { id: 'nerd', icon: '🤓' }
];

const EXPENSE_CATEGORIES = [
  { id: 'accommodation', name: 'Accommodation', icon: '🏨' },
  { id: 'flights', name: 'Flights', icon: '✈️' },
  { id: 'car', name: 'Car Rental/Taxi', icon: '🚖' },
  { id: 'food', name: 'Food', icon: '🍽️' },
  { id: 'drinks', name: 'Drinks', icon: '🍷' },
  { id: 'activities', name: 'Activities', icon: '🎯' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'other', name: 'Other', icon: '📌' }
];

const FAMILY_ALLOCATION_METHODS = {
  EQUAL_SPLIT: 'equal_split',
  PER_PERSON: 'per_person',
  CUSTOM_RATIO: 'custom_ratio'
};

const initialParticipantState = {
  name: '',
  type: 'individual',
  familyMembers: { adults: 1, children: 0 },
  customRatio: 1,
  avatarType: 'happy'
};

const initialExpenseState = {
  category: '',
  amount: '',
  description: '',
  participants: [],
  date: new Date().toISOString().split('T')[0],
  paidBy: ''
};

export default function VacationExpenseCalculator() {
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [familyAllocationMethod, setFamilyAllocationMethod] = useState(FAMILY_ALLOCATION_METHODS.EQUAL_SPLIT);
  const [newExpense, setNewExpense] = useState(initialExpenseState);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipant, setNewParticipant] = useState(initialParticipantState);

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data and start over?')) {
      setParticipants([]);
      setExpenses([]);
      setSelectedParticipant(null);
      setNewExpense(initialExpenseState);
      setShowAddParticipant(false);
      setNewParticipant(initialParticipantState);
    }
  };

  const addParticipant = () => {
    if (newParticipant.name.trim()) {
      setParticipants([...participants, {
        id: Date.now(),
        ...newParticipant,
        avatar: newParticipant.type === 'family' 
          ? '👨‍👩‍👧‍👦' 
          : INDIVIDUAL_AVATARS.find(a => a.id === newParticipant.avatarType)?.icon || '😊'
      }]);
      setNewParticipant(initialParticipantState);
      setShowAddParticipant(false);
    }
  };

  const addExpense = () => {
    if (newExpense.amount && newExpense.category && newExpense.paidBy) {
      setExpenses([...expenses, {
        id: Date.now(),
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      }]);
      setNewExpense(initialExpenseState);
    }
  };

  const calculateParticipantWeight = (participant) => {
    if (!participant) return 1;
    if (participant.type === 'individual') return 1;
    
    switch (familyAllocationMethod) {
      case FAMILY_ALLOCATION_METHODS.EQUAL_SPLIT:
        return 1;
      case FAMILY_ALLOCATION_METHODS.PER_PERSON:
        return participant.familyMembers.adults + (participant.familyMembers.children * 0.5);
      case FAMILY_ALLOCATION_METHODS.CUSTOM_RATIO:
        return participant.customRatio;
      default:
        return 1;
    }
  };

  const calculateTotalPerPerson = () => {
    const shares = {};
    participants.forEach(p => shares[p.id] = { total: 0, expenses: [] });

    expenses.forEach(expense => {
      const relevantParticipants = expense.participants.length ? 
        expense.participants : participants.map(p => p.id);
      
      const totalWeight = relevantParticipants
        .map(id => calculateParticipantWeight(participants.find(p => p.id === id)))
        .reduce((sum, weight) => sum + weight, 0);

      relevantParticipants.forEach(participantId => {
        const participant = participants.find(p => p.id === participantId);
        const weight = calculateParticipantWeight(participant);
        const share = (expense.amount * weight) / totalWeight;
        
        shares[participantId].total += share;
        shares[participantId].expenses.push({
          ...expense,
          share
        });
      });
    });

    return shares;
  };

  const calculateNetBalances = () => {
    const balances = {};
    const settlements = [];
    
    // Initialize balances
    participants.forEach(p => {
      balances[p.id] = {
        paid: 0,
        owes: shares[p.id]?.total || 0,
        participant: p
      };
    });

    // Calculate what each person has paid
    expenses.forEach(expense => {
      if (expense.paidBy) {
        balances[expense.paidBy].paid += expense.amount;
      }
    });

    // Calculate net amounts
    participants.forEach(p => {
      balances[p.id].net = balances[p.id].paid - balances[p.id].owes;
    });

    // Calculate settlements
    const debtors = participants.filter(p => balances[p.id].net < 0)
      .sort((a, b) => balances[a.id].net - balances[b.id].net);
    const creditors = participants.filter(p => balances[p.id].net > 0)
      .sort((a, b) => balances[b.id].net - balances[a.id].net);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const debtorOwes = Math.abs(balances[debtor.id].net);
      const creditorGets = balances[creditor.id].net;
      
      const amount = Math.min(debtorOwes, creditorGets);
      if (amount > 0.01) { // Avoid tiny transactions
        settlements.push({
          from: debtor,
          to: creditor,
          amount
        });
      }

      balances[debtor.id].net += amount;
      balances[creditor.id].net -= amount;

      if (Math.abs(balances[debtor.id].net) < 0.01) i++;
      if (Math.abs(balances[creditor.id].net) < 0.01) j++;
    }

    return { balances, settlements };
  };

  const exportData = () => {
    const { balances, settlements } = calculateNetBalances();
    
    const data = {
      participants: participants,
      expenses: expenses,
      summary: {
        totalExpenses,
        byCategory: EXPENSE_CATEGORIES.map(cat => ({
          category: cat.name,
          total: expenses
            .filter(e => e.category === cat.id)
            .reduce((sum, exp) => sum + exp.amount, 0)
        })).filter(cat => cat.total > 0)
      },
      individualShares: Object.entries(shares).map(([id, data]) => ({
        participant: participants.find(p => p.id.toString() === id),
        total: data.total,
        expenses: data.expenses
      })),
      settlements
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vacation-expenses.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSettlements = () => {
    const { settlements } = calculateNetBalances();

    return (
      <div className="space-y-4">
        <h4 className="font-medium mb-2">Settlement Plan:</h4>
        {settlements.length === 0 ? (
          <p className="text-gray-600">No settlements needed - all expenses are settled!</p>
        ) : (
          <div className="space-y-2">
            {settlements.map((settlement, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <span>{settlement.from.avatar} {settlement.from.name}</span>
                <span className="text-gray-500">should pay</span>
                <span className="font-medium">${settlement.amount.toFixed(2)}</span>
                <span className="text-gray-500">to</span>
                <span>{settlement.to.avatar} {settlement.to.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetailedBreakdown = () => {
    const { balances } = calculateNetBalances();

    return (
      <div className="mt-6 space-y-4">
        <h4 className="font-medium mb-2">Detailed Payment Breakdown:</h4>
        {participants.map(participant => {
          const balance = balances[participant.id];
          
          return (
            <div key={participant.id} className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {participant.avatar} {participant.name}
                </span>
                <span className={`font-medium ${
                  balance.net > 0 ? 'text-green-600' : balance.net < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  Net: ${balance.net.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Paid: ${balance.paid.toFixed(2)}</p>
                  <div className="mt-2">
                    <p className="font-medium">Payments made:</p>
                    {expenses
                      .filter(e => e.paidBy === participant.id)
                      .map(expense => (
                        <div key={expense.id} className="flex justify-between items-center mt-1">
                          <span>{EXPENSE_CATEGORIES.find(cat => cat.id === expense.category)?.icon} {expense.description || expense.category}</span>
                          <span>${expense.amount.toFixed(2)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Owes: ${balance.owes.toFixed(2)}</p>
                  <div className="mt-2">
                    <p className="font-medium">Share of expenses:</p>
                    {shares[participant.id]?.expenses.map(expense => (
                      <div key={expense.id} className="flex justify-between items-center mt-1">
                        <span>{EXPENSE_CATEGORIES.find(cat => cat.id === expense.category)?.icon} {expense.description || expense.category}</span>
                        <span>${expense.share.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const shares = calculateTotalPerPerson();
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pieData = participants.map(p => ({
    name: p.name,
    value: shares[p.id]?.total || 0
  }));

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Vacation Cost Sharing Calculator
            </h1>
            <button
              onClick={clearAllData}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Participants Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Participants</h3>
              <button
                onClick={() => setShowAddParticipant(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add Participant
              </button>
            </div>

            {showAddParticipant && (
              <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-4">
                <input
                  type="text"
                  placeholder="Participant name"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
                <select
                  value={newParticipant.type}
                  onChange={(e) => setNewParticipant({...newParticipant, type: e.target.value})}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="individual">Individual 👤</option>
                  <option value="family">Family 👨‍👩‍👧‍👦</option>
                </select>

                {newParticipant.type === 'individual' && (
                  <div>
                    <label className="block text-sm mb-2">Choose Avatar:</label>
                    <div className="flex gap-2 flex-wrap">
                      {INDIVIDUAL_AVATARS.map(avatar => (
                        <button
                          key={avatar.id}
                          onClick={() => setNewParticipant({...newParticipant, avatarType: avatar.id})}
                          className={`p-2 text-xl rounded-md ${
                            newParticipant.avatarType === avatar.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200'
                          }`}
                        >
                          {avatar.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {newParticipant.type === 'family' && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div>
                        <label className="block text-sm">Adults</label>
                        <input
                          type="number"
                          min="1"
                          value={newParticipant.familyMembers.adults}
                          onChange={(e) => setNewParticipant({
                            ...newParticipant,
                            familyMembers: {...newParticipant.familyMembers, adults: parseInt(e.target.value)}
                          })}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm">Children</label>
                        <input
                          type="number"
                          min="0"
                          value={newParticipant.familyMembers.children}
                          onChange={(e) => setNewParticipant({
                            ...newParticipant,
                            familyMembers: {...newParticipant.familyMembers, children: parseInt(e.target.value)}
                          })}
                          className="w-full p-2 border rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={addParticipant}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowAddParticipant(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {participants.map(participant => (
                <button
                  key={participant.id}
                  onClick={() => setSelectedParticipant(
                    selectedParticipant === participant.id ? null : participant.id
                  )}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                    selectedParticipant === participant.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <span>{participant.avatar}</span>
                  <span>{participant.name}</span>
                  {participant.type === 'family' && (
                    <span className={`text-sm ${
                      selectedParticipant === participant.id ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      ({participant.familyMembers.adults}A, {participant.familyMembers.children}C)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Add Expense Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full p-2 border rounded-md bg-white"
                >
                  <option value="">Select Category</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                className="w-full p-2 border rounded-md"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full p-2 border rounded-md"
              />

              {/* Paid By Section */}
              <div>
                <p className="mb-2">Paid by:</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map(participant => (
                    <button
                      key={participant.id}
                      onClick={() => setNewExpense({
                        ...newExpense,
                        paidBy: newExpense.paidBy === participant.id ? '' : participant.id
                      })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                        newExpense.paidBy === participant.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <span>{participant.avatar}</span>
                      <span>{participant.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2">Split between:</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map(participant => (
                    <button
                      key={participant.id}
                      onClick={() => {
                        const isSelected = newExpense.participants.includes(participant.id);
                        setNewExpense({
                          ...newExpense,
                          participants: isSelected
                            ? newExpense.participants.filter(id => id !== participant.id)
                            : [...newExpense.participants, participant.id]
                        });
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                        newExpense.participants.includes(participant.id)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      <span>{participant.avatar}</span>
                      <span>{participant.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {newExpense.participants.length === 0
                    ? "Will be split among all participants"
                    : `Will be split among ${newExpense.participants.length} selected participant(s)`}
                </p>
              </div>

              <button
                onClick={addExpense}
                disabled={!newExpense.amount || !newExpense.category || !newExpense.paidBy}
                className={`w-full px-4 py-2 rounded-md ${
                  !newExpense.amount || !newExpense.category || !newExpense.paidBy
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                Add Expense
              </button>
            </div>
          </div>

          {/* Family Allocation Method - Only shown when there are families */}
          {participants.some(p => p.type === 'family') && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Family Expense Settings</h3>
              <select
                value={familyAllocationMethod}
                onChange={(e) => {
                  setFamilyAllocationMethod(e.target.value);
                  if (e.target.value !== FAMILY_ALLOCATION_METHODS.CUSTOM_RATIO) {
                    setParticipants(participants.map(p => ({
                      ...p,
                      customRatio: 1
                    })));
                  }
                }}
                className="w-full p-2 border rounded-md bg-white"
              >
                <option value={FAMILY_ALLOCATION_METHODS.EQUAL_SPLIT}>
                  Equal Split (Families count as one unit)
                </option>
                <option value={FAMILY_ALLOCATION_METHODS.PER_PERSON}>
                  Per Person (Adults = 1, Children = 0.5)
                </option>
                <option value={FAMILY_ALLOCATION_METHODS.CUSTOM_RATIO}>
                  Custom Ratio
                </option>
              </select>

              {familyAllocationMethod === FAMILY_ALLOCATION_METHODS.CUSTOM_RATIO && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-gray-600">Set custom ratios for each participant:</p>
                  {participants.map(participant => (
                    <div key={participant.id} className="flex items-center gap-4">
                      <span className="flex items-center gap-2">
                        {participant.avatar} {participant.name}
                      </span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={participant.customRatio || 1}
                        onChange={(e) => {
                          const newRatio = parseFloat(e.target.value) || 1;
                          setParticipants(participants.map(p => 
                            p.id === participant.id 
                              ? {...p, customRatio: newRatio}
                              : p
                          ));
                        }}
                        className="w-24 p-2 border rounded-md"
                      />
                      <span className="text-sm text-gray-600">
                        {participant.type === 'family' 
                          ? `(${participant.familyMembers.adults}A, ${participant.familyMembers.children}C)`
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-600 mt-2">
                {familyAllocationMethod === FAMILY_ALLOCATION_METHODS.EQUAL_SPLIT && 
                  "Each family unit pays an equal share, regardless of size"}
                {familyAllocationMethod === FAMILY_ALLOCATION_METHODS.PER_PERSON &&
                  "Costs are split by number of people, with children counting as half"}
                {familyAllocationMethod === FAMILY_ALLOCATION_METHODS.CUSTOM_RATIO &&
                  "Use the ratios above to determine how costs are split"}
              </p>
            </div>
          )}

          {/* Summary Section */}
          {expenses.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Summary</h3>
                <button
                  onClick={exportData}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Total Expenses: ${totalExpenses.toFixed(2)}</h4>
                    <div className="space-y-2">
                      {EXPENSE_CATEGORIES.map(cat => {
                        const categoryTotal = expenses
                          .filter(e => e.category === cat.id)
                          .reduce((sum, exp) => sum + exp.amount, 0);
                        if (categoryTotal > 0) {
                          return (
                            <div key={cat.id} className="flex justify-between">
                              <span>{cat.icon} {cat.name}</span>
                              <span>${categoryTotal.toFixed(2)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Per Person Breakdown:</h4>
                    <div className="space-y-2">
                      {participants.map(p => (
                        <div key={p.id} className="flex justify-between">
                          <span>{p.avatar} {p.name}</span>
                          <span>${shares[p.id]?.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, value}) => `${name}: $${value.toFixed(2)}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Settlements Section */}
              {renderSettlements()}

              {/* Detailed Breakdown */}
              {renderDetailedBreakdown()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}