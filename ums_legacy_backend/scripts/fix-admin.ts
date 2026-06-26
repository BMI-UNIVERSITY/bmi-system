import PocketBase from 'pocketbase'; 
const pb = new PocketBase('http://127.0.0.1:8090'); 
pb.autoCancellation(false); 

async function run() { 
  try {
      const r = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ identity: 'admin@bmi.edu', password: (process.env.POCKETBASE_ADMIN_PASSWORD ?? '') }) 
      }); 
      
      const d = await r.json(); 
      pb.authStore.save(d.token, d.admin); 
      
      const adminUser = await pb.collection('users').getFirstListItem('email="admin@bmi.edu"'); 
      console.log('Current user:', adminUser);
      await pb.collection('users').update(adminUser.id, { 
          isActive: true,
          name: adminUser.name || 'System Admin',
          role: adminUser.role || 'admin'
      }); 
      console.log('Admin account activated successfully!'); 
  } catch (e) {
      console.error(e);
  }
} 
run();
