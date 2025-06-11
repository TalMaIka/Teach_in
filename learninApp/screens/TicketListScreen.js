import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Button, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function TicketListScreen({ teacherId, studentId, userRole }) {
  const [tickets, setTickets] = useState([]);
  const [responseTexts, setResponseTexts] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageUri, setModalImageUri] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherList, setTeacherList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentList, setStudentList] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        let url;
        if (userRole === 'student') {
          url = `http://10.0.2.2:3001/tickets/student/${studentId}`;
        } else if (userRole === 'teacher') {
          url = `http://10.0.2.2:3001/tickets/teacher/${teacherId}`;
        } else if (userRole === 'admin') {
          url = `http://10.0.2.2:3001/admin/tickets`;
        }

        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setTickets(data);

        if (userRole === 'student') {
          const teachers = Array.from(
            new Map(data.map(t => [t.teacher_id, { id: t.teacher_id, name: t.teacher_name }])).values()
          );
          setTeacherList(teachers);
        }
        if (userRole === 'teacher') {
          const students = Array.from(
            new Map(data.map(t => [t.student_id, { id: t.student_id, name: t.student_name }])).values()
          );
          setStudentList(students);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        Alert.alert('Error', 'Could not load tickets: ' + err.message);
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

  const showAttachmentModal = (filename) => {
    setModalImageUri(`http://10.0.2.2:3001/uploads/${filename}`);
    setModalVisible(true);
  };

  const renderAttachment = (item) => {
    if (!item.attachment) return null;
    const uri = `http://10.0.2.2:3001/uploads/${item.attachment}`;
    return (
      <TouchableOpacity onPress={() => showAttachmentModal(item.attachment)} style={styles.attachmentContainer}>
        <Image
          source={{ uri }}
          style={styles.attachment}
          resizeMode="cover"
        />
        <Text style={styles.attachmentLabel}>Tap to View Attachment</Text>
      </TouchableOpacity>
    );
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
            <Text style={styles.status}>Status: {item.response ? 'Answered' : 'Pending'}</Text>
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
            <Text style={styles.status}>Status: {item.response ? 'Answered' : 'Pending'}</Text>
          </>
        )}

        {renderAttachment(item)}

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

  // Filter tickets for students by selected teacher
  const filteredByTeacher = userRole === 'student' && selectedTeacher
    ? tickets.filter(t => t.teacher_id === selectedTeacher)
    : tickets;

  // Filter tickets for teachers by selected student
  const filteredTickets = userRole === 'teacher' && selectedStudent
    ? filteredByTeacher.filter(t => t.student_id === selectedStudent)
    : filteredByTeacher;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      {userRole === 'student' && teacherList.length > 0 && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedTeacher}
            onValueChange={setSelectedTeacher}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="All Teachers" value="" />
            {teacherList.map(teacher => (
              <Picker.Item key={teacher.id} label={teacher.name} value={teacher.id} />
            ))}
          </Picker>
        </View>
      )}

      {userRole === 'teacher' && studentList.length > 0 && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedStudent}
            onValueChange={setSelectedStudent}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item label="All Students" value="" />
            {studentList.map(student => (
              <Picker.Item key={student.id} label={student.name} value={student.id} />
            ))}
          </Picker>
        </View>
      )}

      {filteredTickets.length === 0 ? (
        <Text style={styles.emptyMessage}>{getEmptyMessage()}</Text>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          style={styles.list}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            {modalImageUri && (
              <Image
                source={{ uri: modalImageUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2c3e50',
  },
  pickerContainer: {
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  picker: {
    width: '100%',
    color: '#2c3e50',
  },
  pickerItem: {
    height: 40,
    fontSize: 16,
    textAlign: 'center',
    color: '#2c3e50',
    paddingVertical: 0,
  },
  list: {
    flex: 1,
  },
  ticket: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 10,
    marginBottom: 5,
  },
  response: {
    fontSize: 14,
    color: '#2c3e50',
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  waiting: {
    fontSize: 14,
    color: '#e67e22',
    fontStyle: 'italic',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 50,
  },
  attachment: {
    width: 120,
    height: 120,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  attachmentContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentLabel: {
    color: '#2980b9',
    marginTop: 4,
    textDecorationLine: 'underline',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    maxWidth: '90%',
    maxHeight: '80%',
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginTop: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
    marginBottom: 4,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});