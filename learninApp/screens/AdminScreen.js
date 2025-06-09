import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ScrollView } from 'react-native';

export default function AdminScreen({ adminId }) {
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchAllTickets();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3001/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllTickets = async () => {
    try {
      const response = await fetch('http://10.0.2.2:3001/admin/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const deleteUser = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://10.0.2.2:3001/admin/users/${userId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                fetchUsers();
                Alert.alert('Success', 'User deleted');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>
          Admin Panel
        </Text>

        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Statistics:
        </Text>
        <Text>Total Users: {users.length}</Text>
        <Text>Total Tickets: {tickets.length}</Text>
        <Text>Students: {users.filter(u => u.role === 'student').length}</Text>
        <Text>Teachers: {users.filter(u => u.role === 'teacher').length}</Text>
        <Text>Admins: {users.filter(u => u.role === 'admin').length}</Text>

        <Text style={{ fontSize: 18, marginTop: 20, marginBottom: 10 }}>
          Users:
        </Text>
        {users.slice(0, 10).map((user) => (
          <View key={user.id} style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#ccc'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>{user.full_name}</Text>
              <Text>{user.email} ({user.role})</Text>
            </View>
            <Button
              title="Delete"
              color="red"
              onPress={() => deleteUser(user.id)}
            />
          </View>
        ))}

        <Text style={{ fontSize: 18, marginTop: 20, marginBottom: 10 }}>
          Recent Tickets:
        </Text>
        {tickets.slice(0, 10).map((ticket) => (
          <View key={ticket.id} style={{
            padding: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#ccc',
            marginBottom: 5
          }}>
            <Text style={{ fontWeight: 'bold' }}>{ticket.subject}</Text>
            <Text>{ticket.student_name} → {ticket.teacher_name}</Text>
            <Text>Status: {ticket.status}</Text>
          </View>
        ))}

        <View style={{ height: 50 }} />
      </View>
    </ScrollView>
  );
}