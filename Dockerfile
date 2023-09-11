FROM python:3.9

WORKDIR /app
COPY thoth-server.py ./
CMD ["python", "thoth-server.py"]
