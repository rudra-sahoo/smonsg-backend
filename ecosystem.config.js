module.exports = {
    apps: [
      {
        name: 'smonsg-backend',         
        script: './index.js',         
        instances: 'max',             
        exec_mode: 'cluster',          
        env: {
          NODE_ENV: 'development',    
          PORT: 5000,
        },
        env_production: {
          NODE_ENV: 'production',     
          PORT: process.env.PORT || 5000,
        },
        log_file: './logs/combined.log', 
        error_file: './logs/error.log',  
        out_file: './logs/out.log',     
        pid_file: './pids/pm2.pid',     
        watch: true,
      },
    ],
  };
  