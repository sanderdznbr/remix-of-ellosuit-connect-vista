
import React from 'react';
import { Search, Settings, FileText, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MailTracking = () => {
  const emailData = [
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 1',
      listColor: 'bg-blue-500'
    },
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 2',
      listColor: 'bg-yellow-500'
    },
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 2',
      listColor: 'bg-yellow-500'
    },
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 2',
      listColor: 'bg-yellow-500'
    },
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 2',
      listColor: 'bg-yellow-500'
    },
    {
      recipient: 'usuario@gmail.com',
      subject: 'Name',
      sentDate: 'Sent on may 18, 2025 at 2:39 AM',
      opens: '3 Opens',
      list: 'List 3',
      listColor: 'bg-red-500'
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input 
              placeholder="Search Contacts" 
              className="pl-10 bg-white border-gray-200"
            />
          </div>
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Mail Tracking</h1>
        
        <div className="flex items-center justify-between">
          <Select defaultValue="all-emails">
            <SelectTrigger className="w-48 bg-gray-200 border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-emails">All Emails</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="unopened">Unopened</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="border-gray-300">
              <Settings size={16} />
            </Button>
            <Button variant="outline" size="icon" className="border-gray-300">
              <FileText size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="text-gray-600 font-medium">RECIPIENTS</TableHead>
              <TableHead className="text-gray-600 font-medium">EMAIL</TableHead>
              <TableHead className="text-gray-600 font-medium">ACTIVITY</TableHead>
              <TableHead className="text-gray-600 font-medium">LIST</TableHead>
              <TableHead className="text-gray-600 font-medium">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailData.map((email, index) => (
              <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <TableCell className="py-4">
                  <span className="text-gray-600">{email.recipient}</span>
                </TableCell>
                <TableCell className="py-4">
                  <div>
                    <div className="font-medium text-gray-800">{email.subject}</div>
                    <div className="text-sm text-gray-500">{email.sentDate}</div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-gray-800">{email.opens}</span>
                </TableCell>
                <TableCell className="py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${email.listColor}`}>
                    {email.list}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                    <MoreHorizontal size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MailTracking;
