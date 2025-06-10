import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Button } from 'react-native';

export default function TicketListScreen({ teacherId, studentId, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({});

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        let url;
        if (userRole === 'student') {
           console.log('student'); // Debugging line
          url = `http://10.0.2.2:3001/tickets/${studentId}`;
        } else if (userRole === 'teacher') {
          url = `http://10.0.2.2:3001/tickets/${teacherId}`;
        } else if (userRole === 'admin') {
          url = `http://10.0.2.2:3001/admin/tickets`;
        }

        const res = await fetch(url);
        const data = await res.json();

        setTickets(data);
      } catch (err) {
        Alert.alert('Error', 'Could not load tickets.');
        console.error('Fetch error:', err);
      }
    };

    if ((userRole === 'student' && studentId) ||
        (userRole === 'teacher' && teacherId) ||
        (userRole === 'admin')) {
      fetchTickets();
    }
  }, [teacherId, studentId, userRole]);

  const handleResponse = async (ticketId) => {
    const responseText = responseTexts[ticketId];
    if (!responseText?.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      const res = await fetch(`http://10.0.2.2:3001/tickets/${ticketId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Response sent successfully');
        setTickets((prevTickets) =>
          prevTickets.map((ticket) =>
            ticket.id === ticketId
              ? { ...ticket, response: responseText, responded_at: new Date().toISOString() }
              : ticket
          )
        );
        setResponseTexts((prev) => ({ ...prev, [ticketId]: '' }));
      } else {
        const errorText = await res.text();
        Alert.alert('Error', errorText);
      }
    } catch (error) {
      Alert.alert('Network error', 'Could not send response');
      console.error('Response error:', error);
    }
  };

  const renderItem = ({ item }) => {
    const isStudent = userRole === 'student';
    const isTeacher = userRole === 'teacher';
    const isAdmin = userRole === 'admin';

    return (
      <View style={styles.ticket}>
        <Text style={styles.subject}>{item.subject}</Text>

        {isStudent && (
          <>
            <Text style={styles.info}>To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
          </>
        )}

        {isTeacher && (
          <>
            <Text style={styles.info}>From: {item.student_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
          </>
        )}

        {isAdmin && (
          <>
            <Text style={styles.info}>From: {item.student_name} → To: {item.teacher_name}</Text>
            <Text style={styles.info}>Message: {item.message}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
          </>
        )}

        <Text style={styles.date}>Sent: {new Date(item.created_at).toLocaleString()}</Text>

        {item.response ? (
          <>
            <Text style={styles.responseLabel}>
              {isStudent ? "Teacher's Response:" : "Your Response:"}
            </Text>
            <Text style={styles.response}>{item.response}</Text>
            {item.responded_at && (
              <Text style={styles.date}>
                Responded: {new Date(item.responded_at).toLocaleString()}
              </Text>
            )}
          </>
        ) : (
          <>
            {isStudent && (
              <Text style={styles.waiting}>⏳ Waiting for teacher's response...</Text>
            )}

            {(isTeacher || isAdmin) && (
              <>
                <TextInput
                  placeholder="Write your response here..."
                  value={responseTexts[item.id] || ''}
                  onChangeText={(text) =>
                    setResponseTexts((prev) => ({ ...prev, [item.id]: text }))
                  }
                  style={styles.input}
                  multiline={true}
                  numberOfLines={3}
                />
                <Button
                  title="📤 Send Response"
                  onPress={() => handleResponse(item.id)}
                  color="#27ae60"
                />
              </>
            )}
          </>
        )}
      </View>
    );
  };

  const getTitle = () => {
    if (userRole === 'student') return '📋 My Tickets';
    if (userRole === 'teacher') return '📥 Tickets Received';
    if (userRole === 'admin') return '🔧 All Tickets';
    return 'Tickets';
  };

  const getEmptyMessage = () => {
    if (userRole === 'student') return 'You haven\'t sent any tickets yet.';
    if (userRole === 'teacher') return 'No tickets received yet.';
    if (userRole === 'admin') return 'No tickets in the system yet.';
    return 'No tickets found.';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333'
  },
  ticket: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subject: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    color: '#2c3e50'
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#34495e'
  },
  date: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic'
  },
  status: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold',
    marginTop: 4
  },
  responseLabel: {
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#27ae60',
    fontSize: 16
  },
  response: {
    marginTop: 5,
    padding: 12,
    backgroundColor: '#e8f8f5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
    color: '#2c3e50'
  },
  waiting: {
    marginTop: 12,
    fontStyle: 'italic',
    color: '#f39c12',
    textAlign: 'center',
    fontSize: 14
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});
